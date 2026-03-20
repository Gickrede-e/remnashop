import { requireApiAdminSession } from "@/lib/api-session";
import { apiError, apiOk } from "@/lib/http";
import { revokeSubscriptionByAdmin } from "@/lib/services/subscriptions";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    const session = await requireApiAdminSession();
    return apiOk(
      await revokeSubscriptionByAdmin({
        adminId: session.userId,
        subscriptionId: id
      })
    );
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Не удалось отозвать подписку", 400);
  }
}
