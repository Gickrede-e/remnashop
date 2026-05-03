import { env } from "@/lib/env";

type PlategaCreatePaymentInput = {
  amount: number;
  description: string;
  paymentId: string;
  successUrl: string;
  failUrl: string;
  paymentMethod: number;
};

type PlategaPaymentResponse = {
  payment_url?: string;
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
  payload?: string;
};

function parsePlategaJson<T>(text: string) {
  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function plategaRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(`https://app.platega.io${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-MerchantId": env.PLATEGA_MERCHANT_ID,
      "X-Secret": env.PLATEGA_API_KEY,
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  const text = await response.text();
  const json = parsePlategaJson<T>(text);

  if (!response.ok) {
    throw new Error(`Platega request failed: ${response.status} ${text}`);
  }

  if (!json) {
    throw new Error("Platega request returned invalid JSON");
  }

  return json;
}

export async function createPlategaPayment(input: PlategaCreatePaymentInput) {
  return plategaRequest<PlategaPaymentResponse>("/transaction/process", {
    method: "POST",
    body: JSON.stringify({
      paymentMethod: input.paymentMethod,
      paymentDetails: {
        amount: input.amount / 100,
        currency: "RUB"
      },
      payload: input.paymentId,
      description: input.description,
      return: input.successUrl,
      failedUrl: input.failUrl
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

  const response = await fetch(`https://app.platega.io/transaction/${input.transactionId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-MerchantId": merchantId,
      "X-Secret": env.PLATEGA_API_KEY
    },
    cache: "no-store"
  });

  const text = await response.text();
  const json = parsePlategaJson<PlategaTransactionStatusResponse>(text);

  if (!response.ok) {
    throw new Error(`Platega status request failed: ${response.status} ${text}`);
  }

  if (!json) {
    throw new Error("Platega status request returned invalid JSON");
  }

  return json;
}
