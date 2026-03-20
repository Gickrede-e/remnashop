import { requireApiAdminSession } from "@/lib/api-session";
import { apiError, apiOk } from "@/lib/http";
import { getAdminStats } from "@/lib/services/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireApiAdminSession();
    return apiOk(await getAdminStats());
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Не удалось получить статистику", 400);
  }
}
