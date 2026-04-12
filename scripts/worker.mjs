import { serializeError, workerLogger as logger } from "./worker-logger.mjs";
import { createWorkerRuntime } from "./worker-runtime.mjs";

const intervalMs = 10 * 60 * 1000;
const baseUrl = process.env.APP_INTERNAL_URL || "http://app:3000";
const cronSecret = process.env.CRON_SECRET;

if (!cronSecret) {
  throw new Error("CRON_SECRET is required for worker");
}

async function runSync() {
  try {
    logger.info("worker.sync_expired.start", { baseUrl });

    const response = await fetch(`${baseUrl}/api/cron/sync-expired`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        "x-cron-secret": cronSecret
      }
    });

    const payload = await response.text();
    logger.info("worker.sync_expired.done", {
      status: response.status,
      body: payload
    });
  } catch (error) {
    logger.error("worker.sync_expired.failed", { error: serializeError(error) });
  }
}

const runtime = createWorkerRuntime({
  intervalMs,
  logger,
  runSync
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    void runtime.stop(signal);
  });
}

runtime.start().then(() => {
  logger.info("worker.shutdown.complete", {});
  process.exit(0);
}).catch((error) => {
  logger.error("worker.fatal", { error: serializeError(error) });
  process.exit(1);
});
