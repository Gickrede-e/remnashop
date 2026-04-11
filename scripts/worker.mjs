import { serializeError, workerLogger as logger } from "./worker-logger.mjs";

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

async function loop() {
  await runSync();

  while (true) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    await runSync();
  }
}

loop().catch((error) => {
  logger.error("worker.fatal", { error: serializeError(error) });
  process.exit(1);
});
