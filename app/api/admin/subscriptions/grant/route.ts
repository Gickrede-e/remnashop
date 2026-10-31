import { requireApiAdminSession } from "@/lib/api-session";
import { apiErrorFrom, apiOk, parseRequestBody } from "@/lib/http";
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
    return apiErrorFrom(error, "Не удалось выдать подписку");
  }
}
