import { randomUUID } from "node:crypto";

import { NextRequest } from "next/server";

import { logger } from "@/lib/server/logger";
import { runWithLoggerContext } from "@/lib/server/logger-context";
import { getClientIp } from "@/lib/server/request-utils";

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
    try {
      return await handler();
    } catch (error) {
      const durationMs = Number((process.hrtime.bigint() - startedAt) / 1_000_000n);

      logger.error("request.failed", { durationMs, error });
      throw error;
    }
  });
}
