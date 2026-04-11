import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  LOG_LEVEL: process.env.LOG_LEVEL
};

async function loadLoggerContextModules() {
  vi.resetModules();
  process.env.NODE_ENV = "test";
  process.env.LOG_LEVEL = "debug";

  const loggerModule = await import("@/lib/server/logger");
  const contextModule = await import("@/lib/server/logger-context");

  return {
    ...loggerModule,
    ...contextModule
  };
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
});

describe("lib/server/logger-context", () => {
  it("returns undefined outside of a logger context", async () => {
    const { getLoggerContext } = await loadLoggerContextModules();

    expect(getLoggerContext()).toBeUndefined();
  });

  it("injects ALS context into logger entries", async () => {
    const { logger, setLogSink, runWithLoggerContext } = await loadLoggerContextModules();
    const entries: Array<Record<string, unknown>> = [];

    setLogSink({
      write(entry) {
        entries.push(entry);
      }
    });

    runWithLoggerContext({ requestId: "req-1" }, () => {
      logger.info("context.info");
    });

    expect(entries[0]).toMatchObject({
      requestId: "req-1"
    });
  });

  it("merges nested contexts", async () => {
    const { logger, setLogSink, runWithLoggerContext } = await loadLoggerContextModules();
    const entries: Array<Record<string, unknown>> = [];

    setLogSink({
      write(entry) {
        entries.push(entry);
      }
    });

    runWithLoggerContext({ a: 1 }, () => {
      runWithLoggerContext({ b: 2 }, () => {
        logger.info("context.merge");
      });
    });

    expect(entries[0]).toMatchObject({
      a: 1,
      b: 2
    });
  });

  it("lets inner contexts override outer values", async () => {
    const { logger, setLogSink, runWithLoggerContext } = await loadLoggerContextModules();
    const entries: Array<Record<string, unknown>> = [];

    setLogSink({
      write(entry) {
        entries.push(entry);
      }
    });

    runWithLoggerContext({ a: 1 }, () => {
      runWithLoggerContext({ a: 2 }, () => {
        logger.info("context.override");
      });
    });

    expect(entries[0]).toMatchObject({
      a: 2
    });
  });

  it("preserves context across async boundaries", async () => {
    const { logger, setLogSink, runWithLoggerContext } = await loadLoggerContextModules();
    const entries: Array<Record<string, unknown>> = [];

    setLogSink({
      write(entry) {
        entries.push(entry);
      }
    });

    await runWithLoggerContext({ a: 1 }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      logger.info("context.async");
    });

    expect(entries[0]).toMatchObject({
      a: 1
    });
  });

  it("does not mix contexts between parallel scopes", async () => {
    const { logger, setLogSink, runWithLoggerContext } = await loadLoggerContextModules();
    const entries: Array<Record<string, unknown>> = [];

    setLogSink({
      write(entry) {
        entries.push(entry);
      }
    });

    await Promise.all([
      runWithLoggerContext({ requestId: "req-a" }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        logger.info("context.parallel", { marker: "a" });
      }),
      runWithLoggerContext({ requestId: "req-b" }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        logger.info("context.parallel", { marker: "b" });
      })
    ]);

    expect(entries).toHaveLength(2);
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ requestId: "req-a", marker: "a" }),
        expect.objectContaining({ requestId: "req-b", marker: "b" })
      ])
    );
  });

  it("lets call fields override ALS context", async () => {
    const { logger, setLogSink, runWithLoggerContext } = await loadLoggerContextModules();
    const entries: Array<Record<string, unknown>> = [];

    setLogSink({
      write(entry) {
        entries.push(entry);
      }
    });

    runWithLoggerContext({ a: 1 }, () => {
      logger.info("context.call_override", { a: 9 });
    });

    expect(entries[0]).toMatchObject({
      a: 9
    });
  });

  it("lets child logger context override ALS context", async () => {
    const { logger, setLogSink, runWithLoggerContext } = await loadLoggerContextModules();
    const entries: Array<Record<string, unknown>> = [];

    setLogSink({
      write(entry) {
        entries.push(entry);
      }
    });

    runWithLoggerContext({ a: 1 }, () => {
      logger.child({ a: 5 }).info("context.child_override");
    });

    expect(entries[0]).toMatchObject({
      a: 5
    });
  });
});
