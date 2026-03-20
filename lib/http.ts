import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { PAGINATION_DEFAULT_LIMIT, PAGINATION_MAX_LIMIT } from "@/lib/constants";
import { env } from "@/lib/env";

export async function parseRequestBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
) {
  const json = await request.json().catch(() => null);
  return schema.parse(json);
}

export function apiError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      details
    },
    { status }
  );
}

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json(
    {
      ok: true,
      data
    },
    { status }
  );
}

export function getPagination(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(
    PAGINATION_MAX_LIMIT,
    Math.max(1, Number(searchParams.get("limit") ?? PAGINATION_DEFAULT_LIMIT))
  );
  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
}

export function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "";
  }

  return request.headers.get("x-real-ip")?.trim() ?? "";
}

export function assertCronSecret(request: NextRequest) {
  const header = request.headers.get("x-cron-secret");
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;

  return header === env.CRON_SECRET || bearer === env.CRON_SECRET;
}
