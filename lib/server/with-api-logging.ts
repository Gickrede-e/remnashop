import { randomUUID } from "node:crypto";

import { NextRequest } from "next/server";

import { getClientIp } from "@/lib/http";
import { logger } from "@/lib/server/logger";
import { runWithLoggerContext } from "@/lib/server/logger-context";

function logInfo(message: string, fields?: Record<string, unknown>) {
  logger.info?.(message, fields);
}

function logError(message: string, fields?: Record<string, unknown>) {
  logger.error?.(message, fields);
}

export async function withApiLogging<T>(
  request: NextRequest | Request,
  handler: () => Promise<T>
): Promise<T> {
  const requestId = request.headers.get("x-request-id")?.trim() || randomUUID();
  const url = new URL(request.url);
  const route = url.pathname;
  const method = request.method;
  const ip = request instanceof NextRequest ? getClientIp(request) : undefined;
  const startedAt = process.hrtime.bigint();

  return runWithLoggerContext({ requestId, route, method, ip }, async () => {
    logInfo("request.started");

    try {
      const result = await handler();
      const durationMs = Number((process.hrtime.bigint() - startedAt) / 1_000_000n);

      logInfo("request.completed", { durationMs });
      return result;
    } catch (error) {
      const durationMs = Number((process.hrtime.bigint() - startedAt) / 1_000_000n);

      logError("request.failed", { durationMs, error });
      throw error;
    }
  });
}
