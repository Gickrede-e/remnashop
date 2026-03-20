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

function normalizeIpAddress(ip: string) {
  let normalized = ip.trim().toLowerCase();
  if (!normalized) {
    return "";
  }

  if (normalized.startsWith("[") && normalized.includes("]")) {
    normalized = normalized.slice(1, normalized.indexOf("]"));
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(normalized)) {
    normalized = normalized.slice(0, normalized.lastIndexOf(":"));
  }

  if (normalized.includes("%")) {
    normalized = normalized.slice(0, normalized.indexOf("%"));
  }

  if (normalized.startsWith("::ffff:")) {
    const mappedIpv4 = normalized.slice("::ffff:".length);
    if (parseIpAddress(mappedIpv4)?.family === 4) {
      return mappedIpv4;
    }
  }

  return normalized;
}

function parseIpv4Part(ip: string) {
  const parts = ip.split(".");
  if (parts.length !== 4) {
    return null;
  }

  const octets = parts.map((part) => {
    if (!/^\d{1,3}$/.test(part)) {
      return null;
    }

    const value = Number(part);
    return value >= 0 && value <= 255 ? value : null;
  });

  if (octets.some((octet) => octet === null)) {
    return null;
  }

  return octets as number[];
}

function parseIpv6Part(ip: string) {
  const [leftRaw, rightRaw, ...rest] = ip.split("::");
  if (rest.length) {
    return null;
  }

  const expand = (part: string) => {
    if (!part) {
      return [];
    }

    const groups: number[] = [];
    for (const segment of part.split(":")) {
      if (!segment) {
        return null;
      }

      if (segment.includes(".")) {
        const ipv4 = parseIpv4Part(segment);
        if (!ipv4) {
          return null;
        }

        groups.push((ipv4[0] << 8) | ipv4[1], (ipv4[2] << 8) | ipv4[3]);
        continue;
      }

      if (!/^[\da-f]{1,4}$/.test(segment)) {
        return null;
      }

      groups.push(Number.parseInt(segment, 16));
    }

    return groups;
  };

  const left = expand(leftRaw);
  const right = expand(rightRaw ?? "");
  if (!left || !right) {
    return null;
  }

  if (ip.includes("::")) {
    const zeros = 8 - left.length - right.length;
    if (zeros < 0) {
      return null;
    }

    return [...left, ...Array.from({ length: zeros }, () => 0), ...right];
  }

  if (left.length !== 8) {
    return null;
  }

  return left;
}

function parseIpAddress(ip: string) {
  const normalized = normalizeIpAddress(ip);
  if (!normalized) {
    return null;
  }

  const ipv4 = parseIpv4Part(normalized);
  if (ipv4) {
    let value = 0n;
    for (const octet of ipv4) {
      value = (value << 8n) | BigInt(octet);
    }

    return {
      family: 4 as const,
      bits: 32,
      value
    };
  }

  const ipv6 = parseIpv6Part(normalized);
  if (ipv6) {
    let value = 0n;
    for (const group of ipv6) {
      value = (value << 16n) | BigInt(group);
    }

    return {
      family: 6 as const,
      bits: 128,
      value
    };
  }

  return null;
}

function matchesIpEntry(candidateIp: string, allowEntry: string) {
  const candidate = parseIpAddress(candidateIp);
  const normalizedEntry = normalizeIpAddress(allowEntry);
  if (!candidate || !normalizedEntry) {
    return false;
  }

  if (!normalizedEntry.includes("/")) {
    const exact = parseIpAddress(normalizedEntry);
    return Boolean(
      exact &&
        exact.family === candidate.family &&
        exact.value === candidate.value
    );
  }

  const [networkRaw, prefixRaw] = normalizedEntry.split("/");
  const network = parseIpAddress(networkRaw);
  const prefix = Number(prefixRaw);

  if (
    !network ||
    network.family !== candidate.family ||
    !Number.isInteger(prefix) ||
    prefix < 0 ||
    prefix > network.bits
  ) {
    return false;
  }

  if (prefix === 0) {
    return true;
  }

  const shift = BigInt(network.bits - prefix);
  return (candidate.value >> shift) === (network.value >> shift);
}

export function verifyYooKassaIp(ip: string) {
  const allowlist = env.yookassaAllowedIps;

  if (!allowlist.length) {
    return env.NODE_ENV !== "production";
  }

  return allowlist.some((entry) => matchesIpEntry(ip, entry));
}
