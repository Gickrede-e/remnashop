import { requireApiAdminSession } from "@/lib/api-session";
import { apiError, apiOk, parseRequestBody } from "@/lib/http";
import { planSchema } from "@/lib/schemas/plans";
import { createPlan, getAllPlans } from "@/lib/services/plans";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireApiAdminSession();
    return apiOk(await getAllPlans());
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Не удалось получить тарифы", 400);
  }
}

export async function POST(request: Request) {
  try {
    await requireApiAdminSession();
    const body = await parseRequestBody(request, planSchema);
    return apiOk(await createPlan(body), 201);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Не удалось создать тариф", 400);
  }
}
