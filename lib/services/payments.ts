import { PaymentProvider, PaymentStatus } from "@prisma/client";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { logger, serializeError } from "@/lib/server/logger";
import { logAdminAction } from "@/lib/services/admin-logs";
import { mapPlategaStatus, mapYooKassaStatus } from "@/lib/services/payment-status";
import { registerPromoUsage, validatePromoCode } from "@/lib/services/promos";
import { activateSubscriptionFromPayment } from "@/lib/services/subscriptions";
import { createPlategaPayment, getPlategaPaymentStatus, verifyPlategaSignature } from "@/lib/services/platega";
import { createYooKassaPayment, getYooKassaPayment, verifyYooKassaIp } from "@/lib/services/yookassa";

export async function createPaymentForUser(input: {
  userId: string;
  planId: string;
  provider: PaymentProvider;
  promoCode?: string;
}) {
  const plan = await prisma.plan.findUnique({
    where: { id: input.planId }
  });

  if (!plan || !plan.isActive) {
    throw new Error("Тариф не найден или выключен");
  }

  let promoOutcome:
    | Awaited<ReturnType<typeof validatePromoCode>>
    | null = null;

  if (input.promoCode) {
    promoOutcome = await validatePromoCode({
      code: input.promoCode,
      planId: plan.id,
      userId: input.userId,
      amount: plan.price
    });
  }

  const amount = promoOutcome?.finalAmount ?? plan.price;
  const payment = await prisma.payment.create({
    data: {
      userId: input.userId,
      planId: plan.id,
      provider: input.provider,
      amount,
      originalAmount: plan.price,
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
      webhookUrl: `${env.NEXT_PUBLIC_SITE_URL}/api/webhook/platega`
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
  await prisma.payment.update({
    where: { id: input.paymentId },
    data: {
      status: PaymentStatus.SUCCEEDED,
      paidAt: new Date(),
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
    status?: string;
    payment_id?: string;
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
  if (!hintedLocalPaymentId) {
    throw new WebhookDropSilentlyError("local payment id missing in hint");
  }

  const localPayment = await prisma.payment.findUnique({
    where: { id: hintedLocalPaymentId }
  });

  if (!localPayment) {
    throw new WebhookDropSilentlyError("local payment not found");
  }

  if (localPayment.status === PaymentStatus.SUCCEEDED && localPayment.subscriptionId) {
    return localPayment;
  }

  const remotePayment = await getYooKassaPayment(remoteId);
  if (remotePayment.metadata?.paymentId !== localPayment.id) {
    throw new WebhookIntegrityError("metadata paymentId mismatch");
  }

  return processYooKassaRemotePayment({
    localPaymentId: localPayment.id,
    remotePayment,
    source: "WEBHOOK"
  });
}

export async function handlePlategaWebhook(input: {
  rawBody: string;
  signature?: string | null;
  secret?: string | null;
  merchantId?: string | null;
  payload: {
    id?: string;
    order_id?: string;
    status?: string;
    payment_id?: string;
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
  if (!verifyPlategaSignature({
    rawBody: input.rawBody,
    signature: input.signature,
    secret: input.secret,
    merchantId: input.merchantId
  })) {
    throw new Error("Invalid Platega signature");
  }

  const localPaymentId =
    input.payload.order_id ??
    input.payload.transaction?.payload ??
    input.payload.transaction?.orderId;
  if (!localPaymentId) {
    throw new Error("order_id is required");
  }

  const localPayment = await prisma.payment.findUnique({
    where: { id: localPaymentId }
  });

  if (!localPayment) {
    throw new Error("Local payment not found");
  }

  if (localPayment.status === PaymentStatus.SUCCEEDED && localPayment.subscriptionId) {
    return localPayment;
  }

  return processPlategaPaymentStatus({
    localPaymentId: localPayment.id,
    payload: input.payload,
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

    const merchantId =
      (payment.providerPayload &&
      typeof payment.providerPayload === "object" &&
      "merchantId" in payment.providerPayload &&
      typeof payment.providerPayload.merchantId === "string"
        ? payment.providerPayload.merchantId
        : null) ||
      (payment.providerPayload &&
      typeof payment.providerPayload === "object" &&
      "merchant_id" in payment.providerPayload &&
      typeof payment.providerPayload.merchant_id === "string"
        ? payment.providerPayload.merchant_id
        : null) ||
      (payment.providerPayload &&
      typeof payment.providerPayload === "object" &&
      "mechantId" in payment.providerPayload &&
      typeof payment.providerPayload.mechantId === "string"
        ? payment.providerPayload.mechantId
        : null) ||
      env.PLATEGA_MERCHANT_ID;

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
