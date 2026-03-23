import { env } from "@/lib/env";

export type RemnawaveUserSnapshot = {
  uuid: string;
  username: string;
  email?: string | null;
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

class RemnawaveRequestError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`Remnawave request failed: ${status} ${body}`);
    this.name = "RemnawaveRequestError";
    this.status = status;
    this.body = body;
  }
}

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

function withOptionalHwidDeviceLimit<T extends { hwidDeviceLimit?: number | null }>(input: T) {
  const { hwidDeviceLimit, ...rest } = input;

  return hwidDeviceLimit == null
    ? rest
    : {
        ...rest,
        hwidDeviceLimit
      };
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
    email: toOptionalString(payload.email),
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

  if (!response.ok) {
    throw new RemnawaveRequestError(response.status, text);
  }

  const json = text ? (JSON.parse(text) as unknown) : null;
  return unwrap<T>(json as RemnawaveEnvelope<T>);
}

export function isRemnawaveNotFoundError(error: unknown) {
  return error instanceof RemnawaveRequestError && error.status === 404;
}

export function isRemnawaveRecoverableIdentityError(error: unknown) {
  return isRemnawaveNotFoundError(error) || (
    error instanceof RemnawaveRequestError &&
    error.status === 400 &&
    /invalid uuid/i.test(error.body)
  );
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
    body: JSON.stringify(withOptionalHwidDeviceLimit(input))
  });
  return normalizeUser(data);
}

export async function getRemnawaveUser(uuid: string) {
  const data = await remnawaveRequest<Record<string, unknown>>(`/api/users/${uuid}`);
  return normalizeUser(data);
}

export async function getRemnawaveUserByUsername(username: string) {
  const data = await remnawaveRequest<Record<string, unknown>>(
    `/api/users/by-username/${encodeURIComponent(username)}`
  );
  return normalizeUser(data);
}

export async function listRemnawaveUsers() {
  const data = await remnawaveRequest<Array<Record<string, unknown>>>("/api/users");
  return data.map(normalizeUser);
}

export async function listRemnawaveUsersByEmail(email: string) {
  const data = await remnawaveRequest<Array<Record<string, unknown>>>(
    `/api/users/by-email/${encodeURIComponent(email)}`
  );
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
      ...withOptionalHwidDeviceLimit(input)
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

export type RemnawaveDevice = {
  hwid: string;
  platform: string | null;
  osVersion: string | null;
  deviceModel: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
};

function normalizeDevice(payload: Record<string, unknown>): RemnawaveDevice {
  return {
    hwid: String(payload.hwid ?? ""),
    platform: toOptionalString(payload.platform),
    osVersion: toOptionalString(payload.osVersion),
    deviceModel: toOptionalString(payload.deviceModel),
    userAgent: toOptionalString(payload.userAgent),
    createdAt: String(payload.createdAt ?? ""),
    updatedAt: String(payload.updatedAt ?? "")
  };
}

export async function getUserDevices(userUuid: string): Promise<{ devices: RemnawaveDevice[]; total: number }> {
  const data = await remnawaveRequest<{ devices: Array<Record<string, unknown>>; total: number }>(
    `/api/hwid/devices/${userUuid}`
  );
  return {
    devices: data.devices.map(normalizeDevice),
    total: data.total
  };
}

export async function deleteUserDevice(
  userUuid: string,
  hwid: string
): Promise<{ devices: RemnawaveDevice[]; total: number }> {
  const data = await remnawaveRequest<{ devices: Array<Record<string, unknown>>; total: number }>(
    "/api/hwid/devices/delete",
    {
      method: "POST",
      body: JSON.stringify({ userUuid, hwid })
    }
  );
  return {
    devices: data.devices.map(normalizeDevice),
    total: data.total
  };
}

export async function deleteAllUserDevices(userUuid: string): Promise<{ total: number }> {
  const data = await remnawaveRequest<{ devices: Array<Record<string, unknown>>; total: number }>(
    "/api/hwid/devices/delete-all",
    {
      method: "POST",
      body: JSON.stringify({ userUuid })
    }
  );
  return { total: data.total };
}

export async function revokeRemnawaveSubscription(uuid: string): Promise<RemnawaveUserSnapshot> {
  const data = await remnawaveRequest<Record<string, unknown>>(
    `/api/users/${uuid}/actions/revoke`,
    {
      method: "POST",
      body: JSON.stringify({})
    }
  );
  return normalizeUser(data);
}
