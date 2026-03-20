import { requireApiAdminSession } from "@/lib/api-session";
import { apiError, apiOk, parseRequestBody } from "@/lib/http";
import { promoCreateSchema } from "@/lib/schemas/payments";
import { deactivatePromo, updatePromo } from "@/lib/services/promos";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    await requireApiAdminSession();
    const body = await parseRequestBody(request, promoCreateSchema);
    return apiOk(await updatePromo(id, body));
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Не удалось обновить промокод", 400);
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    await requireApiAdminSession();
    return apiOk(await deactivatePromo(id));
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Не удалось деактивировать промокод", 400);
  }
}
