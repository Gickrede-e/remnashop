import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  LOG_LEVEL: process.env.LOG_LEVEL,
  LOG_FORMAT: process.env.LOG_FORMAT,
  NO_COLOR: process.env.NO_COLOR
};

async function loadLoggerModule(overrides?: {
  NODE_ENV?: string;
  LOG_LEVEL?: string;
  LOG_FORMAT?: string;
  NO_COLOR?: string;
}) {
  vi.resetModules();
  process.env.NODE_ENV = overrides?.NODE_ENV ?? ORIGINAL_ENV.NODE_ENV ?? "test";

  if (overrides?.LOG_LEVEL === undefined) {
    delete process.env.LOG_LEVEL;
  } else {
    process.env.LOG_LEVEL = overrides.LOG_LEVEL;
  }

  if (overrides?.LOG_FORMAT === undefined) {
    delete process.env.LOG_FORMAT;
  } else {
    process.env.LOG_FORMAT = overrides.LOG_FORMAT;
  }

  if (overrides?.NO_COLOR === undefined) {
    delete process.env.NO_COLOR;
  } else {
    process.env.NO_COLOR = overrides.NO_COLOR;
  }

  return import("@/lib/server/logger");
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();

  if (ORIGINAL_ENV.NODE_ENV === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = ORIGINAL_ENV.NODE_ENV;
  }

  if (ORIGINAL_ENV.LOG_LEVEL === undefined) {
    delete process.env.LOG_LEVEL;
  } else {
    process.env.LOG_LEVEL = ORIGINAL_ENV.LOG_LEVEL;
  }

  if (ORIGINAL_ENV.LOG_FORMAT === undefined) {
    delete process.env.LOG_FORMAT;
  } else {
    process.env.LOG_FORMAT = ORIGINAL_ENV.LOG_FORMAT;
  }

  if (ORIGINAL_ENV.NO_COLOR === undefined) {
    delete process.env.NO_COLOR;
  } else {
    process.env.NO_COLOR = ORIGINAL_ENV.NO_COLOR;
  }
});

describe("lib/server/logger", () => {
  it("writes info entries with standard metadata and fields", async () => {
    const { logger, setLogSink } = await loadLoggerModule({
      LOG_LEVEL: "info"
    });
    const entries: Array<Record<string, unknown>> = [];

    setLogSink({
      write(entry) {
        entries.push(entry);
      }
    });

    logger.info("test.message", { requestId: "req-1", count: 2 });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      level: "info",
      msg: "test.message",
      requestId: "req-1",
      count: 2
    });
    expect(entries[0]?.ts).toEqual(expect.any(String));
  });

  it("does not write debug entries when LOG_LEVEL is info", async () => {
    const { logger, setLogSink } = await loadLoggerModule({
      LOG_LEVEL: "info"
    });
    const entries: Array<Record<string, unknown>> = [];

    setLogSink({
      write(entry) {
        entries.push(entry);
      }
    });

    logger.debug("debug.hidden", { sample: true });

    expect(entries).toHaveLength(0);
  });

  it("writes debug entries when LOG_LEVEL is debug", async () => {
    const { logger, setLogSink } = await loadLoggerModule({
      LOG_LEVEL: "debug"
    });
    const entries: Array<Record<string, unknown>> = [];

    setLogSink({
      write(entry) {
        entries.push(entry);
      }
    });

    logger.debug("debug.visible", { sample: true });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      level: "debug",
      msg: "debug.visible",
      sample: true
    });
  });

  it("merges child context into emitted entries", async () => {
    const { logger, setLogSink } = await loadLoggerModule({
      LOG_LEVEL: "info"
    });
    const entries: Array<Record<string, unknown>> = [];

    setLogSink({
      write(entry) {
        entries.push(entry);
      }
    });

    logger.child({ a: 1 }).info("child.message");

    expect(entries[0]).toMatchObject({
      a: 1
    });
  });

  it("lets call fields override child context", async () => {
    const { logger, setLogSink } = await loadLoggerModule({
      LOG_LEVEL: "info"
    });
    const entries: Array<Record<string, unknown>> = [];

    setLogSink({
      write(entry) {
        entries.push(entry);
      }
    });

    logger.child({ a: 1 }).info("child.override", { a: 2 });

    expect(entries[0]).toMatchObject({
      a: 2
    });
  });

  it("merges nested child logger contexts", async () => {
    const { logger, setLogSink } = await loadLoggerModule({
      LOG_LEVEL: "info"
    });
    const entries: Array<Record<string, unknown>> = [];

    setLogSink({
      write(entry) {
        entries.push(entry);
      }
    });

    logger.child({ a: 1 }).child({ b: 2 }).info("child.nested");

    expect(entries[0]).toMatchObject({
      a: 1,
      b: 2
    });
  });

  it("redacts sensitive keys recursively", async () => {
    const { logger, setLogSink } = await loadLoggerModule({
      LOG_LEVEL: "info"
    });
    const entries: Array<Record<string, unknown>> = [];

    setLogSink({
      write(entry) {
        entries.push(entry);
      }
    });

    logger.info("redact.nested", {
      password: "secret",
      user: {
        token: "abc",
        name: "Jane"
      }
    });

    expect(entries[0]).toMatchObject({
      password: "[REDACTED]",
      user: {
        token: "[REDACTED]",
        name: "Jane"
      }
    });
  });

  it("handles circular references in fields", async () => {
    const { logger, setLogSink } = await loadLoggerModule({
      LOG_LEVEL: "info"
    });
    const entries: Array<Record<string, unknown>> = [];
    const self: Record<string, unknown> = {};

    self.self = self;

    setLogSink({
      write(entry) {
        entries.push(entry);
      }
    });

    logger.info("redact.circular", { payload: self });

    expect(entries[0]).toMatchObject({
      payload: {
        self: "[Circular]"
      }
    });
  });

  it("truncates very long strings", async () => {
    const { logger, setLogSink } = await loadLoggerModule({
      LOG_LEVEL: "info"
    });
    const entries: Array<Record<string, unknown>> = [];
    const longString = "x".repeat(600);

    setLogSink({
      write(entry) {
        entries.push(entry);
      }
    });

    logger.info("redact.truncate", { body: longString });

    expect(entries[0]?.body).toBe(`${"x".repeat(512)}…(truncated, totalLen=600)`);
  });

  it("serializes native errors", async () => {
    const { serializeError } = await loadLoggerModule();
    const error = serializeError(new Error("boom"));

    expect(error).toMatchObject({
      name: "Error",
      message: "boom"
    });
    expect(error.stack).toEqual(expect.any(String));
  });

  it("serializes AppError metadata", async () => {
    const { serializeError } = await loadLoggerModule();
    const { AppError } = await import("@/lib/http/errors");
    const error = serializeError(
      new AppError({
        code: "TEAPOT",
        message: "short and stout",
        status: 418,
        retryable: true
      })
    );

    expect(error).toMatchObject({
      name: "AppError",
      message: "short and stout",
      code: "TEAPOT",
      status: 418,
      retryable: true
    });
  });

  it("serializes cause chains", async () => {
    const { serializeError } = await loadLoggerModule();
    const rootCause = new Error("root");
    const topLevel = new Error("top", { cause: rootCause });
    const error = serializeError(topLevel);

    expect(error).toMatchObject({
      message: "top",
      cause: {
        message: "root"
      }
    });
  });

  it("serializes null values as string messages", async () => {
    const { serializeError } = await loadLoggerModule();

    expect(serializeError(null)).toEqual({
      message: "null"
    });
  });

  it("writes JSON stdout entries as single newline-terminated objects", async () => {
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const { logger } = await loadLoggerModule({
      NODE_ENV: "production",
      LOG_LEVEL: "info",
      LOG_FORMAT: "json"
    });

    logger.info("json.output", { b: 2, a: 1 });

    expect(writeSpy).toHaveBeenCalledTimes(1);
    const line = String(writeSpy.mock.calls[0]?.[0] ?? "");

    expect(line.endsWith("\n")).toBe(true);
    expect(JSON.parse(line)).toEqual({
      ts: expect.any(String),
      level: "info",
      msg: "json.output",
      a: 1,
      b: 2
    });
  });

  it("writes pretty stdout entries with uppercase level labels and k=v fields", async () => {
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const { logger } = await loadLoggerModule({
      NODE_ENV: "development",
      LOG_LEVEL: "info",
      LOG_FORMAT: "pretty",
      NO_COLOR: "1"
    });

    logger.info("pretty.output", {
      route: "/api/login",
      durationMs: 42,
      details: {
        status: 200
      }
    });

    expect(writeSpy).toHaveBeenCalledTimes(1);
    const line = String(writeSpy.mock.calls[0]?.[0] ?? "");

    expect(line).toContain(" INFO ");
    expect(line).toContain("route=/api/login");
    expect(line).toContain("durationMs=42");
    expect(line).not.toContain("{");
  });
});
