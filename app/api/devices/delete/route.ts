import { requireApiSession } from "@/lib/api-session";
import { apiError, apiOk, parseRequestBody } from "@/lib/http";
import { deviceDeleteSchema } from "@/lib/schemas/devices";
import { RateLimitExceededError, enforceRateLimit } from "@/lib/server/rate-limit";
import { getUserById } from "@/lib/services/auth";
import { deleteUserDevice } from "@/lib/services/remnawave";

export async function POST(request: Request) {
  try {
    const session = await requireApiSession();

    try {
      enforceRateLimit({
        key: `device-delete:${session.userId}`,
        max: 30,
        windowMs: 60_000
      });
    } catch (error) {
      if (error instanceof RateLimitExceededError) {
        return apiError("Слишком много операций с устройствами.", 429);
      }
      throw error;
    }

    const { hwid } = await parseRequestBody(request, deviceDeleteSchema);
    const user = await getUserById(session.userId);

    if (!user?.remnawaveUuid) {
      return apiError("Подписка не привязана к панели", 400);
    }

    const result = await deleteUserDevice(user.remnawaveUuid, hwid);
    return apiOk({ total: result.total });
  } catch (error) {
    const status = error instanceof Error && "status" in error ? Number(error.status) : 400;
    return apiError(error instanceof Error ? error.message : "Не удалось удалить устройство", status);
  }
}
