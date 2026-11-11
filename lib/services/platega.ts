import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

// Platega API client (https://docs.platega.io). Amounts cross this boundary in rubles;
// the rest of the app keeps kopecks.

const PLATEGA_BASE_URL = "https://app.platega.io";
const PLATEGA_TIMEOUT_MS = 15_000;

type PlategaCreatePaymentInput = {
  amount: number;
  description: string;
  paymentId: string;
  userId: string;
  userEmail: string;
  returnUrl: string;
  failedUrl: string;
};

type PlategaCreatedTransaction = {
  transactionId?: string;
  url?: string;
};

export type PlategaTransaction = {
  id: string;
  status: string;
  paymentDetails?: {
    amount?: number;
    currency?: string;
  };
  payload?: string;
};

async function plategaRequest<T>(path: string, init?: RequestInit) {
  let response: Response;

  try {
    response = await fetch(`${PLATEGA_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-MerchantId": env.PLATEGA_MERCHANT_ID,
        "X-Secret": env.PLATEGA_API_KEY
      },
      cache: "no-store",
      signal: AbortSignal.timeout(PLATEGA_TIMEOUT_MS)
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("Platega request timed out", { cause: error });
    }

    throw error;
  }

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Platega request failed: ${response.status} ${text}`);
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(`Platega returned invalid JSON: ${response.status}`, { cause: error });
  }
}

// The v2 endpoint takes no paymentMethod: the buyer picks СБП, card or crypto on Platega's own page.
export async function createPlategaPayment(input: PlategaCreatePaymentInput) {
  return plategaRequest<PlategaCreatedTransaction>("/v2/transaction/process", {
    method: "POST",
    body: JSON.stringify({
      paymentDetails: {
        amount: input.amount / 100,
        currency: "RUB"
      },
      description: input.description,
      return: input.returnUrl,
      failedUrl: input.failedUrl,
      payload: input.paymentId,
      metadata: {
        user_email: input.userEmail,
        userId: input.userId
      }
    })
  });
}

export async function getPlategaTransaction(transactionId: string) {
  return plategaRequest<PlategaTransaction>(`/transaction/${encodeURIComponent(transactionId)}`);
}

function isSameSecret(received: string | null, expected: string) {
  if (!received || !expected) {
    return false;
  }

  const receivedBytes = Buffer.from(received, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  return receivedBytes.length === expectedBytes.length && timingSafeEqual(receivedBytes, expectedBytes);
}

// Platega signs callbacks with the merchant's own X-MerchantId / X-Secret headers.
export function verifyPlategaCallbackHeaders(headers: Headers) {
  return (
    isSameSecret(headers.get("x-merchantid"), env.PLATEGA_MERCHANT_ID) &&
    isSameSecret(headers.get("x-secret"), env.PLATEGA_API_KEY)
  );
}
