import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  LOG_LEVEL: process.env.LOG_LEVEL
};

async function loadApiLoggingModules() {
  vi.resetModules();
  process.env.NODE_ENV = "test";
  process.env.LOG_LEVEL = "debug";

  const loggerModule = await import("@/lib/server/logger");
  const apiLoggingModule = await import("@/lib/server/with-api-logging");

  return {
    ...loggerModule,
    ...apiLoggingModule
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

describe("lib/server/with-api-logging", () => {
  it("returns the handler result without emitting lifecycle noise", async () => {
    const { setLogSink, withApiLogging } = await loadApiLoggingModules();
    const entries: Array<Record<string, unknown>> = [];

    setLogSink({
      write(entry) {
        entries.push(entry);
      }
    });

    const response = await withApiLogging(
      new Request("http://localhost/api/test", {
        method: "POST",
        headers: {
          "x-request-id": "req-123"
        }
      }),
      async () => "ok"
    );

    expect(response).toBe("ok");
    expect(entries).toEqual([]);
  });

  it("extracts ip from NextRequest x-forwarded-for into nested logs", async () => {
    const { NextRequest } = await import("next/server");
    const { logger, setLogSink, withApiLogging } = await loadApiLoggingModules();
    const entries: Array<Record<string, unknown>> = [];

    setLogSink({
      write(entry) {
        entries.push(entry);
      }
    });

    await withApiLogging(
      new NextRequest("http://localhost/api/test", {
        method: "GET",
        headers: {
          "x-forwarded-for": "198.51.100.1, 10.0.0.1"
        }
      }),
      async () => {
        logger.info("nested.ip");
        return "ok";
      }
    );

    expect(entries[0]).toMatchObject({
      msg: "nested.ip",
      ip: "198.51.100.1"
    });
  });

  it("logs request.failed and rethrows handler errors", async () => {
    const { setLogSink, withApiLogging } = await loadApiLoggingModules();
    const entries: Array<Record<string, unknown>> = [];

    setLogSink({
      write(entry) {
        entries.push(entry);
      }
    });

    await expect(
      withApiLogging(
        new Request("http://localhost/api/fail", {
          method: "POST",
          headers: {
            "x-request-id": "req-failed"
          }
        }),
        async () => {
          throw new Error("boom");
        }
      )
    ).rejects.toThrow("boom");

    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          msg: "request.failed",
          requestId: "req-failed",
          route: "/api/fail",
          method: "POST",
          durationMs: expect.any(Number),
          error: expect.objectContaining({
            message: "boom"
          })
        })
      ])
    );
  });

  it("propagates request metadata into nested logger calls", async () => {
    const { logger, setLogSink, withApiLogging } = await loadApiLoggingModules();
    const entries: Array<Record<string, unknown>> = [];

    setLogSink({
      write(entry) {
        entries.push(entry);
      }
    });

    await withApiLogging(
      new Request("http://localhost/api/nested", {
        method: "GET",
        headers: {
          "x-request-id": "req-nested"
        }
      }),
      async () => {
        logger.info("nested.log");
        return "done";
      }
    );

    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          msg: "nested.log",
          requestId: "req-nested",
          route: "/api/nested",
          method: "GET"
        })
      ])
    );
  });

  it("reuses incoming request ids and generates ids when absent", async () => {
    const { logger, setLogSink, withApiLogging } = await loadApiLoggingModules();
    const entries: Array<Record<string, unknown>> = [];

    setLogSink({
      write(entry) {
        entries.push(entry);
      }
    });

    await withApiLogging(
      new Request("http://localhost/api/incoming", {
        method: "POST",
        headers: {
          "x-request-id": "req-incoming"
        }
      }),
      async () => {
        logger.info("request.marker", { marker: "incoming" });
        return "incoming";
      }
    );

    await withApiLogging(
      new Request("http://localhost/api/generated", {
        method: "POST"
      }),
      async () => {
        logger.info("request.marker", { marker: "generated" });
        return "generated";
      }
    );

    const markerEntries = entries.filter((entry) => entry.msg === "request.marker");
    const incomingEntry = markerEntries.find((entry) => entry.marker === "incoming");
    const generatedEntry = markerEntries.find((entry) => entry.marker === "generated");

    expect(incomingEntry).toMatchObject({
      requestId: "req-incoming"
    });
    expect(generatedEntry?.requestId).toEqual(expect.stringMatching(/^[0-9a-f-]{36}$/i));
  });

  it("keeps parallel invocations isolated", async () => {
    const { logger, setLogSink, withApiLogging } = await loadApiLoggingModules();
    const entries: Array<Record<string, unknown>> = [];

    setLogSink({
      write(entry) {
        entries.push(entry);
      }
    });

    await Promise.all([
      withApiLogging(
        new Request("http://localhost/api/one", {
          method: "POST"
        }),
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          logger.info("parallel.marker", { marker: "one" });
          return "one";
        }
      ),
      withApiLogging(
        new Request("http://localhost/api/two", {
          method: "POST"
        }),
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          logger.info("parallel.marker", { marker: "two" });
          return "two";
        }
      )
    ]);

    const markerEntries = entries.filter((entry) => entry.msg === "parallel.marker");

    expect(markerEntries).toHaveLength(2);
    expect(markerEntries[0]?.requestId).not.toBe(markerEntries[1]?.requestId);
    expect(markerEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ route: "/api/one", marker: "one" }),
        expect.objectContaining({ route: "/api/two", marker: "two" })
      ])
    );
  });
});
