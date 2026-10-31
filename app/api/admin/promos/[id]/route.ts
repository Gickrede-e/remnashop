import { requireApiAdminSession } from "@/lib/api-session";
import { apiErrorFrom, apiOk, parseRequestBody } from "@/lib/http";
import { promoCreateSchema } from "@/lib/schemas/payments";
import { logAdminAction } from "@/lib/services/admin-logs";
import { deactivatePromo, updatePromo } from "@/lib/services/promos";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const session = await requireApiAdminSession();
    const body = await parseRequestBody(request, promoCreateSchema);
    const promo = await updatePromo(id, body);
    await logAdminAction({
      adminId: session.userId,
      action: "UPDATE_PROMO",
      targetType: "PROMO_CODE",
      targetId: id,
      details: {
        code: body.code,
        type: body.type,
        value: body.value,
        isActive: body.isActive
      }
    });
    return apiOk(promo);
  } catch (error) {
    return apiErrorFrom(error, "Не удалось обновить промокод");
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    const session = await requireApiAdminSession();
    const promo = await deactivatePromo(id);
    await logAdminAction({
      adminId: session.userId,
      action: "DEACTIVATE_PROMO",
      targetType: "PROMO_CODE",
      targetId: id,
      details: {
        isActive: false
      }
    });
    return apiOk(promo);
  } catch (error) {
    return apiErrorFrom(error, "Не удалось деактивировать промокод");
  }
}
