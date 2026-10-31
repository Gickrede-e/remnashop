import { requireApiAdminSession } from "@/lib/api-session";
import { apiErrorFrom, apiOk } from "@/lib/http";
import { getAdminStats } from "@/lib/services/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireApiAdminSession();
    return apiOk(await getAdminStats());
  } catch (error) {
    return apiErrorFrom(error, "Не удалось получить статистику");
  }
}
