import { type NextRequest, NextResponse } from "next/server";

import { assertCronSecret } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getMetrics } from "@/lib/server/metrics";
import { pingSmtp } from "@/lib/services/notifications";
import { pingRemnawave } from "@/lib/services/remnawave";

export const dynamic = "force-dynamic";

const PROBE_TIMEOUT_MS = 2_000;

async function probeDb(timeoutMs: number): Promise<boolean> {
  try {
    return await Promise.race([
      prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs))
    ]);
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  // Shallow liveness by default: an unauthenticated caller only learns the
  // process is up. The deep probe below fans out to the DB + an AUTHENTICATED
  // Remnawave call + an SMTP handshake — leaving that public let anyone amplify a
  // cheap GET flood into load on those backends (and hammer the third-party panel
  // with our token). The deep check is gated by CRON_SECRET for the internal
  // scraper / uptime monitor, mirroring /api/metrics. (The container healthcheck
  // uses the shallow path — process-alive is the right liveness signal.)
  if (!assertCronSecret(request)) {
    return NextResponse.json({ ok: true, status: "alive" }, { status: 200 });
  }

  const [db, remnawave, smtp] = await Promise.all([
    probeDb(PROBE_TIMEOUT_MS),
    pingRemnawave(PROBE_TIMEOUT_MS),
    pingSmtp(PROBE_TIMEOUT_MS)
  ]);

  const checks = {
    db: db ? "ok" : "fail",
    remnawave: remnawave ? "ok" : "fail",
    smtp: smtp ? "ok" : "fail"
  };
  const ok = db && remnawave && smtp;

  if (!ok) {
    const metrics = getMetrics();
    if (!db) metrics.healthCheckFailed.inc({ component: "db" });
    if (!remnawave) metrics.healthCheckFailed.inc({ component: "remnawave" });
    if (!smtp) metrics.healthCheckFailed.inc({ component: "smtp" });
  }

  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503 });
}
