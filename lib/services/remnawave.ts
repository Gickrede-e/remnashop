import { env } from "@/lib/env";

export type RemnawaveUserSnapshot = {
  uuid: string;
  username: string;
  shortUuid?: string | null;
  status?: string | null;
  expireAt?: string | null;
  trafficLimitBytes?: number | null;
  trafficUsedBytes?: number | null;
  subscriptionUrl?: string | null;
};

type RemnawaveEnvelope<T> = {
  response?: T;
  data?: T;
  result?: T;
};

function toOptionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toOptionalNumber(value: unknown) {
  return typeof value === "number"
    ? value
    : typeof value === "string" && value.length > 0
      ? Number(value)
      : null;
}

function unwrap<T>(value: RemnawaveEnvelope<T> | T): T {
  if (typeof value === "object" && value !== null) {
    const maybeEnvelope = value as RemnawaveEnvelope<T>;
    return maybeEnvelope.response ?? maybeEnvelope.data ?? maybeEnvelope.result ?? (value as T);
  }
  return value as T;
}

function normalizeUser(payload: Record<string, unknown>): RemnawaveUserSnapshot {
  const userTraffic =
    typeof payload.userTraffic === "object" && payload.userTraffic !== null
      ? (payload.userTraffic as Record<string, unknown>)
      : null;
  const shortUuid =
    typeof payload.shortUuid === "string"
      ? payload.shortUuid
      : typeof payload.short_uuid === "string"
        ? payload.short_uuid
        : null;

  return {
    uuid: String(payload.uuid ?? payload.id ?? ""),
    username: String(payload.username ?? ""),
    shortUuid,
    status: payload.status ? String(payload.status) : null,
    expireAt: toOptionalString(payload.expireAt) ?? toOptionalString(payload.expire_at),
    trafficLimitBytes:
      toOptionalNumber(payload.trafficLimitBytes) ?? toOptionalNumber(payload.traffic_limit_bytes),
    trafficUsedBytes:
      toOptionalNumber(payload.trafficUsedBytes) ??
      toOptionalNumber(payload.traffic_used_bytes) ??
      toOptionalNumber(userTraffic?.usedTrafficBytes),
    subscriptionUrl:
      toOptionalString(payload.subscriptionUrl) ??
      (shortUuid ? `${env.REMNAWAVE_BASE_URL}/api/sub/${shortUuid}` : null)
  };
}

async function remnawaveRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${env.REMNAWAVE_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.REMNAWAVE_API_TOKEN}`,
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  const text = await response.text();
  const json = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    throw new Error(`Remnawave request failed: ${response.status} ${text}`);
  }

  return unwrap<T>(json as RemnawaveEnvelope<T>);
}

export async function createRemnawaveUser(input: {
  username: string;
  expireAt: string;
  status?: string;
  trafficLimitBytes?: number;
  trafficLimitStrategy?: string;
  description?: string;
  email?: string | null;
  tag?: string | null;
  activeInternalSquads?: string[];
  externalSquadUuid?: string | null;
  hwidDeviceLimit?: number | null;
}) {
  const data = await remnawaveRequest<Record<string, unknown>>("/api/users", {
    method: "POST",
    body: JSON.stringify(input)
  });
  return normalizeUser(data);
}

export async function getRemnawaveUser(uuid: string) {
  const data = await remnawaveRequest<Record<string, unknown>>(`/api/users/${uuid}`);
  return normalizeUser(data);
}

export async function listRemnawaveUsers() {
  const data = await remnawaveRequest<Array<Record<string, unknown>>>("/api/users");
  return data.map(normalizeUser);
}

export async function updateRemnawaveUser(
  uuid: string,
  input: {
    expireAt?: string;
    trafficLimitBytes?: number;
    status?: string;
    trafficLimitStrategy?: string;
    description?: string;
    tag?: string | null;
    activeInternalSquads?: string[];
    externalSquadUuid?: string | null;
    hwidDeviceLimit?: number | null;
  }
) {
  const data = await remnawaveRequest<Record<string, unknown>>("/api/users", {
    method: "PATCH",
    body: JSON.stringify({
      uuid,
      ...input
    })
  });
  return normalizeUser(data);
}

export async function enableRemnawaveUser(uuid: string) {
  await remnawaveRequest(`/api/users/${uuid}/actions/enable`, { method: "POST" });
}

export async function disableRemnawaveUser(uuid: string) {
  await remnawaveRequest(`/api/users/${uuid}/actions/disable`, { method: "POST" });
}

export async function getRemnawaveSubscriptionByShortUuid(shortUuid: string) {
  return remnawaveRequest<Record<string, unknown>>(
    `/api/subscriptions/by-short-uuid/${shortUuid}`
  );
}
