import { PaymentProvider, PaymentStatus } from "@prisma/client";

import { env } from "@/lib/env";
import { isSupportedPlategaPaymentMethod } from "@/lib/payments/platega-methods";
import { calculateDurationPricing, normalizePaymentMonths } from "@/lib/payments/pricing";
import { isPaymentProviderEnabledFromEnv } from "@/lib/payments/provider-config";
import { prisma } from "@/lib/prisma";
import { logger, serializeError } from "@/lib/server/logger";
import { logAdminAction } from "@/lib/services/admin-logs";
import { mapPlategaStatus, mapYooKassaStatus } from "@/lib/services/payment-status";
import { registerPromoUsage, validatePromoCode } from "@/lib/services/promos";
import { activateSubscriptionFromPayment } from "@/lib/services/subscriptions";
import { createPlategaPayment, getPlategaPaymentStatus } from "@/lib/services/platega";
import {
  createYooKassaPayment,
  getYooKassaPayment,
  parseYooKassaAmountToMinorUnits,
  verifyYooKassaIp
} from "@/lib/services/yookassa";

export async function createPaymentForUser(input: {
  userId: string;
  planId: string;
  provider: PaymentProvider;
  promoCode?: string;
  months?: number;
  paymentMethod?: number;
}) {
  if (!isPaymentProviderEnabledFromEnv(input.provider)) {
    throw new Error("Способ оплаты недоступен");
  }

  const plan = await prisma.plan.findUnique({
    where: { id: input.planId }
  });

  if (!plan || !plan.isActive) {
    throw new Error("Тариф не найден или выключен");
  }

  let promoOutcome:
    | Awaited<ReturnType<typeof validatePromoCode>>
    | null = null;

  const months = normalizePaymentMonths(input.months);
  const durationPricing = calculateDurationPricing(plan.price, months);

  if (input.promoCode) {
    promoOutcome = await validatePromoCode({
      code: input.promoCode,
      planId: plan.id,
      userId: input.userId,
      amount: durationPricing.subtotalAmount
    });
  }

  const amount = promoOutcome?.finalAmount ?? durationPricing.subtotalAmount;
  let selectedPlategaPaymentMethod: number | null = null;

  if (input.provider === PaymentProvider.PLATEGA) {
    selectedPlategaPaymentMethod = input.paymentMethod ?? env.plategaPaymentMethods[0] ?? null;
    if (!selectedPlategaPaymentMethod) {
      throw Object.assign(new Error("Методы оплаты Platega не настроены"), {
        status: 400
      });
    }

    if (
      !isSupportedPlategaPaymentMethod(selectedPlategaPaymentMethod) ||
      !env.plategaPaymentMethods.includes(selectedPlategaPaymentMethod)
    ) {
      throw Object.assign(new Error("Недоступный метод оплаты Platega"), {
        status: 400
      });
    }
  }

  const payment = await prisma.payment.create({
    data: {
      userId: input.userId,
      planId: plan.id,
      provider: input.provider,
      amount,
      originalAmount: durationPricing.baseAmount,
      months,
      promoCodeId: promoOutcome?.promo.id ?? null,
      providerPayload: {}
    }
  });

  if (promoOutcome?.promo.id) {
    await registerPromoUsage({
      promoCodeId: promoOutcome.promo.id,
      userId: input.userId,
      paymentId: payment.id
    });
  }

  const returnUrl = `${env.NEXT_PUBLIC_SITE_URL}/dashboard`;
  const failUrl = `${env.NEXT_PUBLIC_SITE_URL}/dashboard?payment=failed`;

  try {
    if (input.provider === PaymentProvider.YOOKASSA) {
      const remote = await createYooKassaPayment({
        amount,
        description: `GickShop — Тариф ${plan.name}`,
        paymentId: payment.id,
        returnUrl
      });

      return prisma.payment.update({
        where: { id: payment.id },
        data: {
          externalPaymentId: remote.id,
          confirmationUrl: remote.confirmation?.confirmation_url ?? null,
          providerPayload: JSON.parse(JSON.stringify(remote))
        }
      });
    }

    const remote = await createPlategaPayment({
      amount,
      description: `GickShop — Тариф ${plan.name}`,
      paymentId: payment.id,
      successUrl: returnUrl,
      failUrl,
      paymentMethod: selectedPlategaPaymentMethod!
    });

    return prisma.payment.update({
      where: { id: payment.id },
      data: {
        externalPaymentId: remote.id ?? remote.transactionId ?? null,
        confirmationUrl: remote.payment_url ?? remote.redirect ?? null,
        providerPayload: JSON.parse(JSON.stringify(remote))
      }
    });
  } catch (error) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        providerPayload: JSON.parse(
          JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown payment provider error"
          })
        )
      }
    });
    throw error;
  }
}

export const createPaymentIntent = createPaymentForUser;

export class WebhookIpForbiddenError extends Error {
  constructor(message = "Webhook source IP is not allowlisted") {
    super(message);
    this.name = "WebhookIpForbiddenError";
  }
}

export class WebhookDropSilentlyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookDropSilentlyError";
  }
}

export class WebhookIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookIntegrityError";
  }
}

export async function getUserPaymentHistory(userId: string) {
  return prisma.payment.findMany({
    where: { userId },
    include: {
      plan: true,
      promoCode: true
    },
    orderBy: { createdAt: "desc" }
  });
}

function normalizeProviderStatus(status?: string | null) {
  return String(status ?? "").trim().toLowerCase();
}

function mergeProviderPayload(current: unknown, patch: Record<string, unknown>) {
  const base =
    current && typeof current === "object" && !Array.isArray(current)
      ? (current as Record<string, unknown>)
      : {};

  return JSON.parse(
    JSON.stringify({
      ...base,
      ...patch
    })
  );
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown payment processing error";
}

function assertYooKassaRemotePaymentMatchesLocal(input: {
  localPayment: {
    id: string;
    amount: number;
    currency: string;
    externalPaymentId?: string | null;
  };
  remotePayment: Awaited<ReturnType<typeof getYooKassaPayment>>;
}) {
  const { localPayment, remotePayment } = input;

  if (remotePayment.metadata?.paymentId !== localPayment.id) {
    throw new WebhookIntegrityError("metadata paymentId mismatch");
  }

  if (
    localPayment.externalPaymentId &&
    remotePayment.id !== localPayment.externalPaymentId
  ) {
    throw new WebhookIntegrityError("remote payment id mismatch");
  }

  const remoteCurrency = String(remotePayment.amount?.currency ?? "")
    .trim()
    .toUpperCase();
  if (!remoteCurrency || remoteCurrency !== localPayment.currency.trim().toUpperCase()) {
    throw new WebhookIntegrityError("currency mismatch");
  }

  const remoteAmount = parseYooKassaAmountToMinorUnits(remotePayment.amount?.value);
  if (remoteAmount === null) {
    throw new WebhookIntegrityError("amount value missing");
  }

  if (remoteAmount !== localPayment.amount) {
    throw new WebhookIntegrityError("amount mismatch");
  }

  if (
    mapYooKassaStatus(normalizeProviderStatus(remotePayment.status)) ===
      PaymentStatus.SUCCEEDED &&
    remotePayment.paid !== true
  ) {
    throw new WebhookIntegrityError("paid flag mismatch");
  }
}

async function writePaymentProcessingFailure(input: {
  paymentId: string;
  provider: PaymentProvider;
  phase: string;
  error: unknown;
  details?: Record<string, unknown>;
}) {
  const message = toErrorMessage(input.error);
  const currentPayment = await prisma.payment.findUnique({
    where: { id: input.paymentId },
    select: { providerPayload: true }
  });

  logger.error("payment.processing_failed", {
    paymentId: input.paymentId,
    provider: input.provider,
    phase: input.phase,
    message,
    error: serializeError(input.error),
    details: input.details
  });

  await Promise.allSettled([
    prisma.payment.update({
      where: { id: input.paymentId },
      data: {
        providerPayload: mergeProviderPayload(currentPayment?.providerPayload, {
          ...(input.details ? { details: input.details } : {}),
          lastProcessingError: {
            phase: input.phase,
            message,
            at: new Date().toISOString()
          }
        })
      }
    }),
    logAdminAction({
      action: "PAYMENT_SYNC_ERROR",
      targetType: "PAYMENT",
      targetId: input.paymentId,
      details: {
        provider: input.provider,
        phase: input.phase,
        message,
        ...(input.details ?? {})
      }
    })
  ]);
}

async function syncPaymentStatusAndActivate(input: {
  paymentId: string;
  provider: PaymentProvider;
  externalPaymentId?: string | null;
  providerPayload?: unknown;
  successDetails?: Record<string, unknown>;
}) {
  // Merge provider sync metadata into payload but DO NOT mark SUCCEEDED here —
  // activateSubscriptionFromPayment owns the status transition (only after Remnawave
  // provisioning succeeds, atomically with subscription link).
  await prisma.payment.update({
    where: { id: input.paymentId },
    data: {
      externalPaymentId: input.externalPaymentId ?? undefined,
      providerPayload:
        input.providerPayload === undefined
          ? undefined
          : mergeProviderPayload(input.providerPayload, {
              lastProviderSync: {
                status: "SUCCEEDED",
                at: new Date().toISOString(),
                ...(input.successDetails ?? {})
              }
            })
    }
  });

  try {
    return await activateSubscriptionFromPayment(input.paymentId);
  } catch (error) {
    await writePaymentProcessingFailure({
      paymentId: input.paymentId,
      provider: input.provider,
      phase: "ACTIVATE_SUBSCRIPTION",
      error,
      details: input.successDetails
    });

    return prisma.payment.findUniqueOrThrow({
      where: { id: input.paymentId }
    });
  }
}

async function processYooKassaRemotePayment(input: {
  localPaymentId: string;
  remotePayment: Awaited<ReturnType<typeof getYooKassaPayment>>;
  source: "WEBHOOK" | "ADMIN_REFRESH";
}) {
  const localPayment = await prisma.payment.findUnique({
    where: { id: input.localPaymentId }
  });

  if (!localPayment) {
    throw new Error("Local payment not found");
  }

  if (localPayment.status === PaymentStatus.SUCCEEDED && localPayment.subscriptionId) {
    return localPayment;
  }

  assertYooKassaRemotePaymentMatchesLocal({
    localPayment: {
      id: localPayment.id,
      amount: localPayment.amount,
      currency: localPayment.currency,
      externalPaymentId: localPayment.externalPaymentId
    },
    remotePayment: input.remotePayment
  });

  const remoteStatus = normalizeProviderStatus(input.remotePayment.status);
  const providerPayload = mergeProviderPayload(input.remotePayment, {
    lastProviderSync: {
      source: input.source,
      remoteStatus,
      at: new Date().toISOString()
    }
  });

  if (mapYooKassaStatus(remoteStatus) === PaymentStatus.SUCCEEDED) {
    return syncPaymentStatusAndActivate({
      paymentId: localPayment.id,
      provider: PaymentProvider.YOOKASSA,
      externalPaymentId: input.remotePayment.id,
      providerPayload,
      successDetails: {
        source: input.source,
        remoteStatus
      }
    });
  }

  return prisma.payment.update({
    where: { id: localPayment.id },
    data: {
      status: mapYooKassaStatus(remoteStatus),
      externalPaymentId: input.remotePayment.id,
      providerPayload
    }
  });
}

async function processPlategaPaymentStatus(input: {
  localPaymentId: string;
  payload: {
    id?: string;
    order_id?: string;
    payload?: string;
    status?: string;
    payment_id?: string;
    paymentMethod?: number;
    merchantId?: string;
    transaction?: {
      id?: string;
      status?: string;
      payload?: string;
      orderId?: string;
      merchantId?: string;
      mechantId?: string;
    };
  };
  source: "WEBHOOK" | "ADMIN_REFRESH";
}) {
  const localPayment = await prisma.payment.findUnique({
    where: { id: input.localPaymentId }
  });

  if (!localPayment) {
    throw new Error("Local payment not found");
  }

  if (localPayment.status === PaymentStatus.SUCCEEDED && localPayment.subscriptionId) {
    return localPayment;
  }

  const remoteStatus = normalizeProviderStatus(
    input.payload.transaction?.status ?? input.payload.status
  );
  const remotePaymentId =
    input.payload.payment_id ??
    input.payload.transaction?.id ??
    input.payload.id;
  const providerPayload = mergeProviderPayload(input.payload, {
    lastProviderSync: {
      source: input.source,
      remoteStatus,
      at: new Date().toISOString()
    }
  });

  if (mapPlategaStatus(remoteStatus) === PaymentStatus.SUCCEEDED) {
    return syncPaymentStatusAndActivate({
      paymentId: localPayment.id,
      provider: PaymentProvider.PLATEGA,
      externalPaymentId: remotePaymentId ?? localPayment.externalPaymentId,
      providerPayload,
      successDetails: {
        source: input.source,
        remoteStatus
      }
    });
  }

  return prisma.payment.update({
    where: { id: localPayment.id },
    data: {
      status: mapPlategaStatus(remoteStatus),
      externalPaymentId: remotePaymentId ?? localPayment.externalPaymentId,
      providerPayload
    }
  });
}

export async function handleYookassaWebhook(input: {
  ip: string;
  event: {
    object?: {
      id?: string;
      status?: string;
      metadata?: {
        paymentId?: string;
        [key: string]: unknown;
      };
    };
  };
}) {
  if (!verifyYooKassaIp(input.ip)) {
    throw new WebhookIpForbiddenError();
  }

  const remoteId = input.event.object?.id;
  if (!remoteId) {
    throw new WebhookDropSilentlyError("remote id missing");
  }

  const hintedLocalPaymentId = input.event.object?.metadata?.paymentId;
  let localPayment =
    hintedLocalPaymentId
      ? await prisma.payment.findUnique({
          where: { id: hintedLocalPaymentId }
        })
      : null;

  if (!localPayment) {
    localPayment = await prisma.payment.findUnique({
      where: { externalPaymentId: remoteId }
    });
  }

  if (!localPayment) {
    throw new WebhookDropSilentlyError("local payment not found");
  }

  if (localPayment.status === PaymentStatus.SUCCEEDED && localPayment.subscriptionId) {
    return localPayment;
  }

  const remotePayment = await getYooKassaPayment(remoteId);
  return processYooKassaRemotePayment({
    localPaymentId: localPayment.id,
    remotePayment,
    source: "WEBHOOK"
  });
}

function readPayloadStringField(payload: unknown, field: string) {
  if (
    payload &&
    typeof payload === "object" &&
    field in payload &&
    typeof (payload as Record<string, unknown>)[field] === "string"
  ) {
    return (payload as Record<string, string>)[field];
  }
  return null;
}

function resolvePlategaMerchantId(localPayloadFromDb: unknown) {
  return (
    readPayloadStringField(localPayloadFromDb, "merchantId") ||
    readPayloadStringField(localPayloadFromDb, "merchant_id") ||
    readPayloadStringField(localPayloadFromDb, "mechantId") ||
    env.PLATEGA_MERCHANT_ID
  );
}

export async function handlePlategaWebhook(input: {
  payload: {
    id?: string;
    order_id?: string;
    payload?: string;
    status?: string;
    payment_id?: string;
    paymentMethod?: number;
    merchantId?: string;
    transaction?: {
      id?: string;
      status?: string;
      payload?: string;
      orderId?: string;
      merchantId?: string;
      mechantId?: string;
    };
  };
}) {
  const localPaymentId =
    input.payload.order_id ??
    input.payload.payload ??
    input.payload.transaction?.payload ??
    input.payload.transaction?.orderId;
  const remotePaymentId =
    input.payload.id ??
    input.payload.payment_id ??
    input.payload.transaction?.id;
  let localPayment = localPaymentId
    ? await prisma.payment.findUnique({
        where: { id: localPaymentId }
      })
    : null;

  if (!localPayment && remotePaymentId) {
    localPayment = await prisma.payment.findUnique({
      where: { externalPaymentId: remotePaymentId }
    });
  }

  if (!localPayment) {
    throw new Error("Local payment not found");
  }

  if (localPayment.status === PaymentStatus.SUCCEEDED && localPayment.subscriptionId) {
    return localPayment;
  }

  const transactionId = localPayment.externalPaymentId ?? remotePaymentId;
  if (!transactionId) {
    throw new Error("Cannot verify Platega webhook: missing transaction id");
  }

  const merchantId = resolvePlategaMerchantId(localPayment.providerPayload);
  const remotePayment = await getPlategaPaymentStatus({ transactionId, merchantId });

  return processPlategaPaymentStatus({
    localPaymentId: localPayment.id,
    payload: {
      id: remotePayment.id,
      payment_id: remotePayment.id,
      status: remotePayment.status,
      payload: remotePayment.payload,
      merchantId:
        remotePayment.merchantId ?? remotePayment.merchant_id ?? remotePayment.mechantId
    },
    source: "WEBHOOK"
  });
}

export async function refreshPaymentStatus(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId }
  });

  if (!payment) {
    throw new Error("Платёж не найден");
  }

  if (payment.status === PaymentStatus.SUCCEEDED && payment.subscriptionId) {
    return payment;
  }

  if (payment.status === PaymentStatus.SUCCEEDED && !payment.subscriptionId) {
    return syncPaymentStatusAndActivate({
      paymentId: payment.id,
      provider: payment.provider,
      externalPaymentId: payment.externalPaymentId,
      providerPayload: payment.providerPayload,
      successDetails: {
        source: "ADMIN_REFRESH",
        remoteStatus: payment.status
      }
    });
  }

  if (payment.provider === PaymentProvider.YOOKASSA) {
    if (!payment.externalPaymentId) {
      throw new Error("У платежа YooKassa отсутствует внешний идентификатор");
    }

    const remotePayment = await getYooKassaPayment(payment.externalPaymentId);
    return processYooKassaRemotePayment({
      localPaymentId: payment.id,
      remotePayment,
      source: "ADMIN_REFRESH"
    });
  }

  if (payment.provider === PaymentProvider.PLATEGA) {
    if (!payment.externalPaymentId) {
      throw new Error("У платежа Platega отсутствует внешний идентификатор");
    }

    const merchantId = resolvePlategaMerchantId(payment.providerPayload);
    const remotePayment = await getPlategaPaymentStatus({
      transactionId: payment.externalPaymentId,
      merchantId
    });

    return processPlategaPaymentStatus({
      localPaymentId: payment.id,
      payload: {
        id: remotePayment.id,
        payment_id: remotePayment.id,
        status: remotePayment.status,
        merchantId: remotePayment.merchantId ?? remotePayment.merchant_id ?? remotePayment.mechantId
      },
      source: "ADMIN_REFRESH"
    });
  }

  throw new Error("Для этого провайдера ручная проверка статуса через API не поддерживается");
}
