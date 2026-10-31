import { requireApiAdminSession } from "@/lib/api-session";
import { apiErrorFrom, apiOk, parseRequestBody } from "@/lib/http";
import { promoCreateSchema } from "@/lib/schemas/payments";
import { logAdminAction } from "@/lib/services/admin-logs";
import { createPromo, listPromoCodes } from "@/lib/services/promos";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireApiAdminSession();
    return apiOk(await listPromoCodes());
  } catch (error) {
    return apiErrorFrom(error, "Не удалось получить промокоды");
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiAdminSession();
    const body = await parseRequestBody(request, promoCreateSchema);
    const promo = await createPromo(body);
    await logAdminAction({
      adminId: session.userId,
      action: "CREATE_PROMO",
      targetType: "PROMO_CODE",
      targetId: promo.id,
      details: {
        code: body.code,
        type: body.type,
        value: body.value
      }
    });
    return apiOk(promo, 201);
  } catch (error) {
    return apiErrorFrom(error, "Не удалось создать промокод");
  }
}
