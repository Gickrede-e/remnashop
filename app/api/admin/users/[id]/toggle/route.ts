import { requireApiAdminSession } from "@/lib/api-session";
import { apiError, apiOk, parseRequestBody } from "@/lib/http";
import { toggleUserSchema } from "@/lib/schemas/admin";
import { toggleUserRemnawaveState } from "@/lib/services/subscriptions";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const session = await requireApiAdminSession();
    const body = await parseRequestBody(request, toggleUserSchema);
    return apiOk({
      enabled: await toggleUserRemnawaveState({
        adminId: session.userId,
        userId: id,
        enabled: body.enabled
      })
    });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Не удалось изменить статус пользователя", 400);
  }
}
