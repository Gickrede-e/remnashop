import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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
    {
      ok: false,
      error: message,
      details
    },
    { status, headers }
  );
}

export function apiOk<T>(data: T, status = 200) {
  const headers = new Headers();
  const requestId = getRequestId();

  if (requestId) {
    headers.set("x-request-id", requestId);
  }

  return NextResponse.json(
    {
      ok: true,
      data
    },
    { status, headers }
  );
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

export function assertCronSecret(request: NextRequest) {
  const header = request.headers.get("x-cron-secret");
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;

  return header === env.CRON_SECRET || bearer === env.CRON_SECRET;
}
