import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("createWorkerRuntime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits for the in-flight sync before completing shutdown", async () => {
    const logger = {
      info: vi.fn(),
      error: vi.fn()
    };

    let resolveRun: (() => void) | undefined;
    const runSync = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRun = resolve;
        })
    );

    const { createWorkerRuntime } = await import("@/scripts/worker-runtime.mjs");
    const runtime = createWorkerRuntime({
      intervalMs: 10_000,
      logger,
      runSync
    });

    const completion = runtime.start();
    await Promise.resolve();

    expect(runSync).toHaveBeenCalledTimes(1);

    let stopped = false;
    const stopPromise = runtime.stop("SIGTERM").then(() => {
      stopped = true;
    });

    await Promise.resolve();
    expect(stopped).toBe(false);

    resolveRun?.();
    await stopPromise;
    await completion;

    expect(logger.info).toHaveBeenCalledWith("worker.shutdown.start", {
      signal: "SIGTERM"
    });

    vi.advanceTimersByTime(10_000);
    expect(runSync).toHaveBeenCalledTimes(1);
  });

  it("cancels the next scheduled cycle when shutdown happens between runs", async () => {
    const logger = {
      info: vi.fn(),
      error: vi.fn()
    };
    const runSync = vi.fn().mockResolvedValue(undefined);

    const { createWorkerRuntime } = await import("@/scripts/worker-runtime.mjs");
    const runtime = createWorkerRuntime({
      intervalMs: 10_000,
      logger,
      runSync
    });

    const completion = runtime.start();
    await Promise.resolve();
    await Promise.resolve();

    expect(runSync).toHaveBeenCalledTimes(1);

    await runtime.stop("SIGINT");
    vi.advanceTimersByTime(10_000);
    await completion;

    expect(runSync).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith("worker.shutdown.start", {
      signal: "SIGINT"
    });
  });
});
