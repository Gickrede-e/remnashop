import { AsyncLocalStorage } from "node:async_hooks";

import type { LogFields } from "@/lib/server/logger";

type LoggerContext = Readonly<LogFields>;

const storage = new AsyncLocalStorage<LoggerContext>();

export function runWithLoggerContext<T>(context: LoggerContext, fn: () => T): T {
  const existing = storage.getStore() ?? {};

  return storage.run({ ...existing, ...context }, fn);
}

export function getLoggerContext(): LoggerContext | undefined {
  return storage.getStore();
}

export function getRequestId(): string | undefined {
  const ctx = getLoggerContext();

  return typeof ctx?.requestId === "string" ? ctx.requestId : undefined;
}
