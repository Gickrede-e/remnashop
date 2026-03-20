import { type NextRequest, NextResponse } from "next/server";

import { requireApiAdminSession } from "@/lib/api-session";
import { exportEntityToCsv } from "@/lib/services/export";

type Params = {
  params: Promise<{
    entity: string;
  }>;
};

export const dynamic = "force-dynamic";

const exportableEntities = ["users", "payments", "subscriptions"] as const;
type ExportableEntity = (typeof exportableEntities)[number];

export async function GET(_: NextRequest, { params }: Params) {
  await requireApiAdminSession();
  const { entity } = await params;
  if (!exportableEntities.includes(entity as ExportableEntity)) {
    return NextResponse.json({ ok: false, error: "Unknown export entity" }, { status: 404 });
  }

  const csv = await exportEntityToCsv(entity as ExportableEntity);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${entity}.csv"`
    }
  });
}
