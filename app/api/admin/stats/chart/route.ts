import { requireApiAdminSession } from "@/lib/api-session";
import { apiErrorFrom, apiOk } from "@/lib/http";
import { getRevenueChartData } from "@/lib/services/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireApiAdminSession();
    return apiOk(await getRevenueChartData());
  } catch (error) {
    return apiErrorFrom(error, "Не удалось получить график");
  }
}
