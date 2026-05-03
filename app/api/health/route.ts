import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
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

export async function GET() {
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

  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503 });
}
