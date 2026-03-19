import "server-only";

import { NextRequest } from "next/server";

import { env } from "@/lib/env";
import { AppError } from "@/lib/http/errors";

export async function parseJson<T>(request: Request) {
  try {
    return (await request.json()) as T;
  } catch {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Некорректный JSON",
      status: 400
    });
  }
}

export function assertSameOrigin(request: NextRequest | Request) {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const expectedOrigin = new URL(env.siteUrl).origin;

  if (origin && origin !== expectedOrigin) {
    throw new AppError({
      code: "FORBIDDEN",
      message: "Недопустимый origin",
      status: 403
    });
  }

  if (!origin && referer && !referer.startsWith(expectedOrigin)) {
    throw new AppError({
      code: "FORBIDDEN",
      message: "Недопустимый referer",
      status: 403
    });
  }
}

export function getRequestIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }

  return request.headers.get("x-real-ip");
}

export function parseDateRange(searchParams: URLSearchParams) {
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  return {
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined
  };
}
