import { requireApiAdminSession } from "@/lib/api-session";
import { apiError, apiOk, parseRequestBody } from "@/lib/http";
import { promoCreateSchema } from "@/lib/schemas/payments";
import { createPromo, listPromoCodes } from "@/lib/services/promos";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireApiAdminSession();
    return apiOk(await listPromoCodes());
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Не удалось получить промокоды", 400);
  }
}

export async function POST(request: Request) {
  try {
    await requireApiAdminSession();
    const body = await parseRequestBody(request, promoCreateSchema);
    return apiOk(await createPromo(body), 201);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Не удалось создать промокод", 400);
  }
}
