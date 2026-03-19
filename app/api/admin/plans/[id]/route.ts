import { requireApiAdminSession } from "@/lib/api-session";
import { apiError, apiOk, parseRequestBody } from "@/lib/http";
import { planSchema } from "@/lib/schemas/plans";
import { deactivatePlan, updatePlan } from "@/lib/services/plans";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    await requireApiAdminSession();
    const body = await parseRequestBody(request, planSchema);
    return apiOk(await updatePlan(id, body));
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Не удалось обновить тариф", 400);
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    await requireApiAdminSession();
    return apiOk(await deactivatePlan(id));
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Не удалось деактивировать тариф", 400);
  }
}
