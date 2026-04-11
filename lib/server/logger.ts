import { inspect } from "node:util";

import { AppError } from "@/lib/http/errors";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

export interface Logger {
  debug(msg: string, fields?: LogFields): void;
  info(msg: string, fields?: LogFields): void;
  warn(msg: string, fields?: LogFields): void;
  error(msg: string, fields?: LogFields): void;
  child(context: LogFields): Logger;
}

export interface LogSink {
  write(entry: SerializedLogEntry): void;
}

export interface SerializedLogEntry {
  ts: string;
  level: LogLevel;
  msg: string;
  [field: string]: unknown;
}

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const REDACTED = "[REDACTED]";
const CIRCULAR = "[Circular]";
const MAX_DEPTH = "[MaxDepth]";
const MAX_REDACTION_DEPTH = 6;
const MAX_ERROR_CAUSE_DEPTH = 3;
const MAX_STRING_LENGTH = 512;
const MAX_STACK_LINES = 15;
const NO_COLOR = "1";

const REDACTED_KEYS = new Set([
  "password",
  "passwordhash",
  "token",
  "secret",
  "authorization",
  "cookie",
  "session",
  "apikey",
  "api_key",
  "webhooksecret",
  "refreshtoken",
  "accesstoken",
  "jwt",
  "bearer"
]);

const minLevel = resolveMinLogLevel();

function resolveMinLogLevel(): LogLevel {
  const fallback = process.env.NODE_ENV === "development" ? "debug" : "info";
  return parseLogLevel(process.env.LOG_LEVEL, fallback);
}

function resolveLogFormat() {
  const fallback = process.env.NODE_ENV === "development" ? "pretty" : "json";
  return process.env.LOG_FORMAT === "pretty" || process.env.LOG_FORMAT === "json"
    ? process.env.LOG_FORMAT
    : fallback;
}

function parseLogLevel(value: string | undefined, fallback: LogLevel): LogLevel {
  if (value === "debug" || value === "info" || value === "warn" || value === "error") {
    return value;
  }

  return fallback;
}

function shouldLog(level: LogLevel) {
  return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[minLevel];
}

function createDefaultSink(): LogSink {
  return resolveLogFormat() === "pretty" ? prettyStdoutSink : jsonStdoutSink;
}

const jsonStdoutSink: LogSink = {
  write(entry) {
    process.stdout.write(`${JSON.stringify(orderSerializedEntry(entry))}\n`);
  }
};

const prettyStdoutSink: LogSink = {
  write(entry) {
    process.stdout.write(`${formatPrettyEntry(entry)}\n`);
  }
};

let currentSink: LogSink = createDefaultSink();

function orderSerializedEntry(entry: SerializedLogEntry): SerializedLogEntry {
  const ordered: SerializedLogEntry = {
    ts: entry.ts,
    level: entry.level,
    msg: entry.msg
  };

  const rest = Object.entries(entry)
    .filter(([key]) => key !== "ts" && key !== "level" && key !== "msg")
    .sort(([left], [right]) => left.localeCompare(right));

  for (const [key, value] of rest) {
    ordered[key] = value;
  }

  return ordered;
}

function formatPrettyEntry(entry: SerializedLogEntry) {
  const ordered = orderSerializedEntry(entry);
  const level = ordered.level.toUpperCase().padEnd(5, " ");
  const coloredLevel = applyLevelColor(level, ordered.level);
  const fields = Object.entries(ordered)
    .filter(([key]) => key !== "ts" && key !== "level" && key !== "msg")
    .map(([key, value]) => `${key}=${formatPrettyValue(value)}`)
    .join(" ");

  return [ordered.ts, coloredLevel, ordered.msg, fields].filter(Boolean).join(" ");
}

function applyLevelColor(levelLabel: string, level: LogLevel) {
  if (!process.stdout.isTTY || process.env.NO_COLOR === NO_COLOR) {
    return levelLabel;
  }

  const colorCode =
    level === "debug" ? "\x1b[2m" : level === "warn" ? "\x1b[33m" : level === "error" ? "\x1b[31m" : "";

  return colorCode ? `${colorCode}${levelLabel}\x1b[0m` : levelLabel;
}

function formatPrettyValue(value: unknown, depth = 0): string {
  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  if (typeof value === "string") {
    return needsQuoting(value) ? JSON.stringify(value) : value;
  }

  if (typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => formatPrettyValue(item, depth + 1)).join(",")}]`;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (depth >= 3 || typeof value !== "object") {
    return inspect(value, { breakLength: Infinity, compact: true }).replace(/[{}]/g, "");
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, nestedValue]) => `${key}:${formatPrettyValue(nestedValue, depth + 1)}`);

  return `(${entries.join(",")})`;
}

function needsQuoting(value: string) {
  return value.length === 0 || /\s|=|,|\(|\)|\[|\]/.test(value);
}

function createLogger(context: LogFields = {}): Logger {
  function write(level: LogLevel, msg: string, fields: LogFields = {}) {
    if (!shouldLog(level)) {
      return;
    }

    const entry = serializeLogEntry(level, msg, {
      ...context,
      ...fields
    });

    currentSink.write(entry);
  }

  return {
    debug(msg, fields) {
      write("debug", msg, fields);
    },
    info(msg, fields) {
      write("info", msg, fields);
    },
    warn(msg, fields) {
      write("warn", msg, fields);
    },
    error(msg, fields) {
      write("error", msg, fields);
    },
    child(nextContext) {
      return createLogger({
        ...context,
        ...nextContext
      });
    }
  };
}

function serializeLogEntry(level: LogLevel, msg: string, fields: LogFields): SerializedLogEntry {
  const redactedFields = redactSensitive(fields);

  return {
    ts: new Date().toISOString(),
    level,
    msg,
    ...redactedFields
  };
}

function redactSensitive(fields: LogFields): LogFields {
  const seen = new WeakSet<object>();

  return sanitizeObject(fields, 0, seen);
}

function sanitizeObject(
  value: Record<string, unknown>,
  depth: number,
  seen: WeakSet<object>
): Record<string, unknown> {
  if (depth > MAX_REDACTION_DEPTH) {
    return { value: MAX_DEPTH };
  }

  if (seen.has(value)) {
    return { value: CIRCULAR };
  }

  seen.add(value);

  const sanitizedEntries = Object.entries(value).map(([key, currentValue]) => [
    key,
    sanitizeValue(currentValue, key, depth + 1, seen)
  ]);

  return Object.fromEntries(sanitizedEntries);
}

function sanitizeValue(
  value: unknown,
  key: string | undefined,
  depth: number,
  seen: WeakSet<object>
): unknown {
  if (key && REDACTED_KEYS.has(key.toLowerCase())) {
    return REDACTED;
  }

  if (typeof value === "string") {
    return truncateString(value);
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Buffer.isBuffer(value)) {
    return `[Buffer len=${value.length}]`;
  }

  if (value instanceof Error) {
    return serializeError(value);
  }

  if (depth > MAX_REDACTION_DEPTH) {
    return MAX_DEPTH;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, undefined, depth + 1, seen));
  }

  if (typeof value !== "object") {
    return String(value);
  }

  if (seen.has(value)) {
    return CIRCULAR;
  }

  seen.add(value);

  const sanitizedEntries = Object.entries(value as Record<string, unknown>).map(([nestedKey, nestedValue]) => [
    nestedKey,
    sanitizeValue(nestedValue, nestedKey, depth + 1, seen)
  ]);

  return Object.fromEntries(sanitizedEntries);
}

function truncateString(value: string) {
  if (value.length <= MAX_STRING_LENGTH) {
    return value;
  }

  return `${value.substring(0, MAX_STRING_LENGTH)}…(truncated, totalLen=${value.length})`;
}

export function serializeError(error: unknown): Record<string, unknown> {
  return serializeErrorInternal(error, 0);
}

function serializeErrorInternal(error: unknown, depth: number): Record<string, unknown> {
  if (error === null || typeof error !== "object") {
    return { message: String(error) };
  }

  if (!(error instanceof Error)) {
    return sanitizeUnknownObject(error);
  }

  const serialized: Record<string, unknown> = {
    name: error.name,
    message: error.message
  };

  if (error.stack) {
    serialized.stack = trimStack(error.stack);
  }

  if (error instanceof AppError) {
    serialized.code = error.code;
    serialized.status = error.status;
    serialized.fieldErrors = error.fieldErrors;
    serialized.retryable = error.retryable;
  }

  const errorWithCause = error as Error & { cause?: unknown };
  if (depth < MAX_ERROR_CAUSE_DEPTH && errorWithCause.cause !== undefined) {
    serialized.cause = serializeErrorInternal(errorWithCause.cause, depth + 1);
  }

  return serialized;
}

function sanitizeUnknownObject(value: unknown): Record<string, unknown> {
  const seen = new WeakSet<object>();
  const sanitized = sanitizeValue(value, undefined, 0, seen);

  return sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)
    ? (sanitized as Record<string, unknown>)
    : { message: String(value) };
}

function trimStack(stack: string) {
  return stack.split("\n").slice(0, MAX_STACK_LINES).join("\n");
}

export const logger = createLogger();

export function setLogSink(sink: LogSink) {
  currentSink = sink;
}

export function resetLogSink() {
  currentSink = createDefaultSink();
}
