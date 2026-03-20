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
};

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
      description: input.description,
      success_url: input.successUrl,
      fail_url: input.failUrl,
      webhook_url: input.webhookUrl
    })
  });
}

export function verifyPlategaSignature(rawBody: string, signature?: string | null) {
  if (!signature) {
    return false;
  }

  const digest = createHmac("sha256", env.PLATEGA_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  return timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}
