const intervalMs = 10 * 60 * 1000;
const baseUrl = process.env.APP_INTERNAL_URL || "http://app:3000";
const cronSecret = process.env.CRON_SECRET;

if (!cronSecret) {
  throw new Error("CRON_SECRET is required for worker");
}

async function runSync() {
  try {
    const response = await fetch(`${baseUrl}/api/cron/sync-expired`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        "x-cron-secret": cronSecret
      }
    });

    const payload = await response.text();
    console.log(`[worker] sync-expired ${response.status} ${payload}`);
  } catch (error) {
    console.error("[worker] sync-expired failed", error);
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
  console.error("[worker] fatal", error);
  process.exit(1);
});
