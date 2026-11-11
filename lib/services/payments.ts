import { PaymentProvider, PaymentStatus } from "@prisma/client";

import { env } from "@/lib/env";
import { calculateDurationPricing, normalizePaymentMonths } from "@/lib/payments/pricing";
import { isPaymentProviderEnabledFromEnv } from "@/lib/payments/provider-config";
import { prisma, toJsonValue } from "@/lib/prisma";
import { logger, serializeError } from "@/lib/server/logger";
import { mapPlategaStatus, mapYooKassaStatus } from "@/lib/services/payment-status";
import { failPromoUsage, registerPromoUsage, validatePromoCode } from "@/lib/services/promos";
import { activateSubscriptionFromPayment } from "@/lib/services/payment-activation";
import {
  createPlategaPayment,
  getPlategaTransaction,
  type PlategaTransaction
} from "@/lib/services/platega";
import {
  createYooKassaPayment,
  getYooKassaPayment,
  parseYooKassaAmountToMinorUnits,
  verifyYooKassaIp
} from "@/lib/services/yookassa";

// Marks a just-created payment FAILED with the reason in its payload so it
// isn't left orphaned as PENDING.
async function failPayment(paymentId: string, reason: string) {
  const result = await prisma.payment.updateMany({
    where: { id: paymentId, activationConfirmedAt: null, status: { not: PaymentStatus.SUCCEEDED } },
    data: { status: PaymentStatus.FAILED, providerPayload: toJsonValue({ error: reason }) }
  });
  return result.count > 0;
}

export async function createPaymentForUser(input: {
  userId: string;
  planId: string;
  provider: PaymentProvider;
  promoCode?: string;
  months?: number;
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
    try {
      await registerPromoUsage({
        promoCodeId: promoOutcome.promo.id,
        userId: input.userId,
        paymentId: payment.id
      });
    } catch (error) {
      // The atomic reservation rejected this redemption (global or per-user cap
      // reached — possibly via a concurrent request that won the race). Mark the
      // just-created payment FAILED so it isn't left orphaned as PENDING, then
      // surface the error.
      await failPayment(payment.id, error instanceof Error ? error.message : "Promo reservation failed");
      throw error;
    }
  }

  const returnUrl = `${env.NEXT_PUBLIC_SITE_URL}/dashboard`;
  const description = `GickShop — Тариф ${plan.name}`;

  try {
    // Both gateways need the buyer's email: Platega's v2 API and YooKassa's 54-ФЗ receipt.
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: input.userId },
      select: { email: true }
    });

    if (input.provider === PaymentProvider.PLATEGA) {
      const remote = await createPlategaPayment({
        amount,
        description,
        paymentId: payment.id,
        userId: input.userId,
        userEmail: user.email,
        returnUrl,
        failedUrl: `${returnUrl}?payment=failed`
      });
      if (!remote.transactionId || !remote.url) {
        throw new Error("Platega did not return a transaction id and payment url");
      }

      return prisma.payment.update({
        where: { id: payment.id },
        data: {
          externalPaymentId: remote.transactionId,
          confirmationUrl: remote.url,
          providerPayload: toJsonValue(remote)
        }
      });
    }

    const remote = await createYooKassaPayment({
      amount,
      description,
      paymentId: payment.id,
      customerEmail: user.email,
      returnUrl
    });

    return prisma.payment.update({
      where: { id: payment.id },
      data: {
        externalPaymentId: remote.id,
        confirmationUrl: remote.confirmation?.confirmation_url ?? null,
        providerPayload: toJsonValue(remote)
      }
    });
  } catch (error) {
    const failed = await failPayment(payment.id, error instanceof Error ? error.message : "Unknown payment provider error");
    // Release the promo reservation when the provider call fails — otherwise an
    // abandoned/declined checkout permanently burns the user's per-user allotment
    // and drains a limited promo's global supply.
    if (failed && promoOutcome?.promo.id) {
      await failPromoUsage(payment.id).catch((rollbackError) => {
        logger.error("payment.promo_rollback_failed", {
          paymentId: payment.id,
          error: serializeError(rollbackError)
        });
      });
    }
    throw error;
  }
}

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
      status: mapYooKassaStatus(remoteStatus),
      at: new Date().toISOString()
    }
  });

  if (mapYooKassaStatus(remoteStatus) === PaymentStatus.SUCCEEDED) {
    return activateSubscriptionFromPayment(localPayment.id, {
      externalPaymentId: input.remotePayment.id,
      providerPayload
    });
  }

  // A late pending/canceled observation cannot revoke a confirmed or completed activation.
  await prisma.payment.updateMany({
    where: { id: localPayment.id, activationConfirmedAt: null, status: { not: PaymentStatus.SUCCEEDED } },
    data: {
      status: mapYooKassaStatus(remoteStatus),
      externalPaymentId: input.remotePayment.id,
      providerPayload
    }
  });
  return prisma.payment.findUniqueOrThrow({ where: { id: localPayment.id } });
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

function assertPlategaTransactionMatchesLocal(input: {
  localPayment: {
    id: string;
    amount: number;
    currency: string;
    externalPaymentId?: string | null;
  };
  transaction: PlategaTransaction;
}) {
  const { localPayment, transaction } = input;

  if (transaction.payload !== localPayment.id) {
    throw new WebhookIntegrityError("payload paymentId mismatch");
  }

  if (localPayment.externalPaymentId && transaction.id !== localPayment.externalPaymentId) {
    throw new WebhookIntegrityError("remote payment id mismatch");
  }

  const remoteCurrency = String(transaction.paymentDetails?.currency ?? "").trim().toUpperCase();
  if (remoteCurrency !== localPayment.currency.trim().toUpperCase()) {
    throw new WebhookIntegrityError("currency mismatch");
  }

  // Platega reports rubles as a JSON number.
  const remoteAmount = transaction.paymentDetails?.amount;
  if (typeof remoteAmount !== "number" || Math.round(remoteAmount * 100) !== localPayment.amount) {
    throw new WebhookIntegrityError("amount mismatch");
  }
}

async function processPlategaTransaction(input: {
  localPaymentId: string;
  transaction: PlategaTransaction;
  source: "WEBHOOK" | "ADMIN_REFRESH";
}) {
  const localPayment = await prisma.payment.findUniqueOrThrow({
    where: { id: input.localPaymentId }
  });

  if (localPayment.status === PaymentStatus.SUCCEEDED && localPayment.subscriptionId) {
    return localPayment;
  }

  assertPlategaTransactionMatchesLocal({ localPayment, transaction: input.transaction });

  const remoteStatus = normalizeProviderStatus(input.transaction.status);
  const status = mapPlategaStatus(remoteStatus);
  const providerPayload = mergeProviderPayload(input.transaction, {
    lastProviderSync: {
      source: input.source,
      remoteStatus,
      status,
      at: new Date().toISOString()
    }
  });

  if (status === PaymentStatus.SUCCEEDED) {
    return activateSubscriptionFromPayment(localPayment.id, {
      externalPaymentId: input.transaction.id,
      providerPayload
    });
  }

  // A late pending/canceled observation cannot revoke a confirmed or completed activation.
  await prisma.payment.updateMany({
    where: { id: localPayment.id, activationConfirmedAt: null, status: { not: PaymentStatus.SUCCEEDED } },
    data: {
      status,
      externalPaymentId: input.transaction.id,
      providerPayload
    }
  });
  return prisma.payment.findUniqueOrThrow({ where: { id: localPayment.id } });
}

// The caller has already checked the callback's X-MerchantId / X-Secret headers. The body is only
// a hint: the status that counts is re-fetched from the Platega API.
export async function handlePlategaWebhook(input: {
  callback: {
    id: string;
    payload?: string;
  };
}) {
  const hintedLocalPaymentId = input.callback.payload;
  let localPayment = hintedLocalPaymentId
    ? await prisma.payment.findUnique({ where: { id: hintedLocalPaymentId } })
    : null;

  if (!localPayment) {
    localPayment = await prisma.payment.findUnique({
      where: { externalPaymentId: input.callback.id }
    });
  }

  if (!localPayment || localPayment.provider !== PaymentProvider.PLATEGA) {
    throw new WebhookDropSilentlyError("local payment not found");
  }

  if (localPayment.status === PaymentStatus.SUCCEEDED && localPayment.subscriptionId) {
    return localPayment;
  }

  const transaction = await getPlategaTransaction(localPayment.externalPaymentId ?? input.callback.id);
  return processPlategaTransaction({
    localPaymentId: localPayment.id,
    transaction,
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
    return activateSubscriptionFromPayment(payment.id);
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

    const transaction = await getPlategaTransaction(payment.externalPaymentId);
    return processPlategaTransaction({
      localPaymentId: payment.id,
      transaction,
      source: "ADMIN_REFRESH"
    });
  }

  throw new Error("Для этого провайдера ручная проверка статуса через API не поддерживается");
}
