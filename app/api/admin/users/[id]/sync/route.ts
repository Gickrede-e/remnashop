import { requireApiAdminSession } from "@/lib/api-session";
import { apiErrorFrom, apiOk } from "@/lib/http";
import { serializeBigInts } from "@/lib/server/bigint";
import { logAdminAction } from "@/lib/services/admin-logs";
import { syncUserSubscription } from "@/lib/services/subscriptions";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    const session = await requireApiAdminSession();
    const user = await syncUserSubscription(id);
    await logAdminAction({
      adminId: session.userId,
      action: "SYNC_USER",
      targetType: "USER",
      targetId: id
    });
    return apiOk(serializeBigInts(user));
  } catch (error) {
    return apiErrorFrom(error, "Не удалось синхронизировать пользователя");
  }
}
