import { Buffer } from "node:buffer";

import { env } from "@/lib/env";

type YooKassaCreatePaymentInput = {
  amount: number;
  description: string;
  paymentId: string;
  returnUrl: string;
};

type YooKassaPayment = {
  id: string;
  status: string;
  paid?: boolean;
  metadata?: Record<string, string>;
  confirmation?: {
    confirmation_url?: string;
  };
};

function getAuthHeader() {
  const token = Buffer.from(
    `${env.YOOKASSA_SHOP_ID}:${env.YOOKASSA_SECRET_KEY}`,
    "utf8"
  ).toString("base64");
  return `Basic ${token}`;
}

async function yookassaRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(`https://api.yookassa.ru${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  const text = await response.text();
  const json = text ? (JSON.parse(text) as T) : ({} as T);

  if (!response.ok) {
    throw new Error(`YooKassa request failed: ${response.status} ${text}`);
  }

  return json;
}

export async function createYooKassaPayment(input: YooKassaCreatePaymentInput) {
  const amountValue = (input.amount / 100).toFixed(2);
  return yookassaRequest<YooKassaPayment>("/v3/payments", {
    method: "POST",
    headers: {
      "Idempotence-Key": input.paymentId
    },
    body: JSON.stringify({
      amount: {
        value: amountValue,
        currency: "RUB"
      },
      confirmation: {
        type: "redirect",
        return_url: input.returnUrl
      },
      capture: true,
      description: input.description,
      metadata: {
        paymentId: input.paymentId
      }
    })
  });
}

export async function getYooKassaPayment(paymentId: string) {
  return yookassaRequest<YooKassaPayment>(`/v3/payments/${paymentId}`);
}

export function verifyYooKassaIp(ip: string) {
  const allowlist = env.YOOKASSA_ALLOWED_IPS.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!allowlist.length) {
    return env.NODE_ENV !== "production";
  }

  return allowlist.includes(ip);
}
