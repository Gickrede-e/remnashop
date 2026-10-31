import { timingSafeEqual } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import type { ApiEnvelope } from "@/lib/api-envelope";
import { PAGINATION_DEFAULT_LIMIT, PAGINATION_MAX_LIMIT } from "@/lib/constants";
import { env } from "@/lib/env";
import { getRequestId } from "@/lib/server/logger-context";
export { getClientIp } from "@/lib/server/request-utils";

export async function parseRequestBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
) {
  const json = await request.json().catch(() => null);
  return schema.parse(json);
}

export function apiError(message: string, status = 400, details?: unknown) {
  const headers = new Headers();
  const requestId = getRequestId();

  if (requestId) {
    headers.set("x-request-id", requestId);
  }

  return NextResponse.json(
    { ok: false, error: message, details } satisfies ApiEnvelope<never>,
    { status, headers }
  );
}

export function apiOk<T>(data: T, status = 200) {
  const headers = new Headers();
  const requestId = getRequestId();

  if (requestId) {
    headers.set("x-request-id", requestId);
  }

  return NextResponse.json({ ok: true, data } satisfies ApiEnvelope<T>, { status, headers });
}

// Maps a thrown error to an API response: Zod → 400 with one readable message, errors
// carrying a numeric `status` (ApiSessionError, RemnawaveRequestError) → that status,
// anything else → 400, because services throw plain Errors worded for the user.
export function apiErrorFrom(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return apiError("Некорректный запрос", 400);
  }
  if (error instanceof Error && "status" in error) {
    const status = Number(error.status);
    return apiError(error.message, Number.isFinite(status) ? status : 400);
  }
  return apiError(error instanceof Error ? error.message : fallback, 400);
}

export function getPagination(searchParams: URLSearchParams) {
  const rawPage = Number(searchParams.get("page") ?? 1);
  const rawLimit = Number(searchParams.get("limit") ?? PAGINATION_DEFAULT_LIMIT);
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.trunc(rawPage)) : 1;
  const limit = Number.isFinite(rawLimit)
    ? Math.min(PAGINATION_MAX_LIMIT, Math.max(1, Math.trunc(rawLimit)))
    : PAGINATION_DEFAULT_LIMIT;
  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
}

// Constant-time comparison so the cron/metrics bearer check leaks no timing
// signal about how much of the secret matched.
function secretMatches(candidate: string | null) {
  if (!candidate) {
    return false;
  }
  const a = Buffer.from(candidate);
  const b = Buffer.from(env.CRON_SECRET);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function assertCronSecret(request: NextRequest) {
  const header = request.headers.get("x-cron-secret");
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;

  return secretMatches(header) || secretMatches(bearer);
}
