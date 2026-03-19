import { requireApiAdminSession } from "@/lib/api-session";
import { apiError, apiOk, parseRequestBody } from "@/lib/http";
import { grantSubscriptionSchema } from "@/lib/schemas/admin";
import { grantSubscriptionByAdmin } from "@/lib/services/subscriptions";

export async function POST(request: Request) {
  try {
    const session = await requireApiAdminSession();
    const body = await parseRequestBody(request, grantSubscriptionSchema);
    const subscription = await grantSubscriptionByAdmin({
      adminId: session.userId,
      ...body
    });
    return apiOk(subscription);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Не удалось выдать подписку", 400);
  }
}
