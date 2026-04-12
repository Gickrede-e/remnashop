import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

type PlategaCreatePaymentInput = {
  amount: number;
  description: string;
  paymentId: string;
  successUrl: string;
  failUrl: string;
  webhookUrl: string;
};

type PlategaPaymentResponse = {
  payment_url: string;
  id?: string;
  transactionId?: string;
  merchantId?: string;
  redirect?: string;
};

type PlategaTransactionStatusResponse = {
  id: string;
  status: string;
  merchantId?: string;
  merchant_id?: string;
  mechantId?: string;
};

function safeCompare(expected: string, actual?: string | null) {
  if (!actual) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

async function plategaRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(`https://platega.io${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.PLATEGA_API_KEY}`,
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  const text = await response.text();
  const json = text ? (JSON.parse(text) as T) : ({} as T);

  if (!response.ok) {
    throw new Error(`Platega request failed: ${response.status} ${text}`);
  }

  return json;
}

export async function createPlategaPayment(input: PlategaCreatePaymentInput) {
  return plategaRequest<PlategaPaymentResponse>("/api/v1/payments", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amount / 100,
      currency: "RUB",
      order_id: input.paymentId,
      payload: input.paymentId,
      description: input.description,
      success_url: input.successUrl,
      fail_url: input.failUrl,
      webhook_url: input.webhookUrl
    })
  });
}

export async function getPlategaPaymentStatus(input: {
  transactionId: string;
  merchantId?: string | null;
}) {
  const merchantId = input.merchantId || env.PLATEGA_MERCHANT_ID;
  if (!merchantId) {
    throw new Error("Для ручной проверки Platega нужен merchant id");
  }

  const response = await fetch(`https://app.platega.io/api/transaction/${input.transactionId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-MerchantId": merchantId,
      "X-Secret": env.PLATEGA_API_KEY
    },
    cache: "no-store"
  });

  const text = await response.text();
  const json = text ? (JSON.parse(text) as PlategaTransactionStatusResponse) : ({} as PlategaTransactionStatusResponse);

  if (!response.ok) {
    throw new Error(`Platega status request failed: ${response.status} ${text}`);
  }

  return json;
}

export function verifyPlategaSignature(input: {
  rawBody: string;
  signature?: string | null;
  secret?: string | null;
  merchantId?: string | null;
}) {
  if (input.signature) {
    const digest = createHmac("sha256", env.PLATEGA_WEBHOOK_SECRET)
      .update(input.rawBody)
      .digest("hex");

    return safeCompare(digest, input.signature);
  }

  return false;
}
