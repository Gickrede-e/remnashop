import { apiError, apiOk } from "@/lib/http";
import { getActivePlans } from "@/lib/services/plans";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return apiOk(await getActivePlans());
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Не удалось получить тарифы", 500);
  }
}
