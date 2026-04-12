import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { AppError, toAppError } from "@/lib/http/errors";
import { getRequestId } from "@/lib/server/logger-context";

export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({ ok: true, data, meta });
}

export function created<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({ ok: true, data, meta }, { status: 201 });
}

export function fail(error: AppError) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        fieldErrors: error.fieldErrors,
        retryable: error.retryable,
        correlationId: getRequestId() ?? randomUUID()
      }
    },
    { status: error.status }
  );
}

export async function withRouteHandler<T>(handler: () => Promise<T>) {
  try {
    return await handler();
  } catch (error) {
    return fail(toAppError(error));
  }
}
