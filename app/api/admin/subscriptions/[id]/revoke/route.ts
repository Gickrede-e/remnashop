import { requireApiAdminSession } from "@/lib/api-session";
import { apiErrorFrom, apiOk } from "@/lib/http";
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
    return apiErrorFrom(error, "Не удалось отозвать подписку");
  }
}
