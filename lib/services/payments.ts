import { PaymentProvider, PaymentStatus } from "@prisma/client";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { registerPromoUsage, validatePromoCode } from "@/lib/services/promos";
import { activateSubscriptionFromPayment } from "@/lib/services/subscriptions";
import { createPlategaPayment, verifyPlategaSignature } from "@/lib/services/platega";
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
        description: `GickVPN — Тариф ${plan.name}`,
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
      description: `GickVPN — Тариф ${plan.name}`,
      paymentId: payment.id,
      successUrl: returnUrl,
      failUrl,
      webhookUrl: `${env.NEXT_PUBLIC_SITE_URL}/api/webhook/platega`
    });

    return prisma.payment.update({
      where: { id: payment.id },
      data: {
        externalPaymentId: remote.id ?? payment.id,
        confirmationUrl: remote.payment_url,
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

export async function handleYookassaWebhook(input: {
  ip: string;
  secret?: string | null;
  event: {
    object?: {
      id?: string;
      status?: string;
      metadata?: Record<string, string>;
    };
  };
}) {
  if (input.secret !== env.YOOKASSA_WEBHOOK_SECRET) {
    throw new Error("Webhook secret mismatch");
  }

  if (!verifyYooKassaIp(input.ip)) {
    throw new Error("Webhook IP is not allowlisted");
  }

  const remoteId = input.event.object?.id;
  if (!remoteId) {
    throw new Error("Payment id missing in YooKassa webhook");
  }

  const remotePayment = await getYooKassaPayment(remoteId);
  const localPaymentId = remotePayment.metadata?.paymentId;
  if (!localPaymentId) {
    throw new Error("Local payment id missing in YooKassa metadata");
  }

  const localPayment = await prisma.payment.findUnique({
    where: { id: localPaymentId }
  });

  if (!localPayment) {
    throw new Error("Local payment not found");
  }

  if (localPayment.status === PaymentStatus.SUCCEEDED) {
    return localPayment;
  }

  await prisma.payment.update({
    where: { id: localPayment.id },
    data: {
      externalPaymentId: remotePayment.id,
      providerPayload: JSON.parse(JSON.stringify(remotePayment))
    }
  });

  if (remotePayment.status === "succeeded") {
    return activateSubscriptionFromPayment(localPayment.id);
  }

  return prisma.payment.update({
    where: { id: localPayment.id },
    data: {
      status:
        remotePayment.status === "canceled" ? PaymentStatus.CANCELED : PaymentStatus.PENDING
    }
  });
}

export async function handlePlategaWebhook(input: {
  rawBody: string;
  signature?: string | null;
  payload: {
    order_id?: string;
    status?: string;
    payment_id?: string;
  };
}) {
  if (!verifyPlategaSignature(input.rawBody, input.signature)) {
    throw new Error("Invalid Platega signature");
  }

  const localPaymentId = input.payload.order_id;
  if (!localPaymentId) {
    throw new Error("order_id is required");
  }

  const localPayment = await prisma.payment.findUnique({
    where: { id: localPaymentId }
  });

  if (!localPayment) {
    throw new Error("Local payment not found");
  }

  if (localPayment.status === PaymentStatus.SUCCEEDED) {
    return localPayment;
  }

  await prisma.payment.update({
    where: { id: localPayment.id },
    data: {
      externalPaymentId: input.payload.payment_id ?? localPayment.externalPaymentId,
      providerPayload: JSON.parse(JSON.stringify(input.payload))
    }
  });

  if (["completed", "succeeded"].includes(String(input.payload.status).toLowerCase())) {
    return activateSubscriptionFromPayment(localPayment.id);
  }

  return prisma.payment.update({
    where: { id: localPayment.id },
    data: {
      status: PaymentStatus.PENDING
    }
  });
}
