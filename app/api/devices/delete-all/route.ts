import { requireApiSession } from "@/lib/api-session";
import { apiError, apiErrorFrom, apiOk } from "@/lib/http";
import { RateLimitExceededError, enforceRateLimit } from "@/lib/server/rate-limit";
import { getUserById } from "@/lib/services/auth";
import { deleteAllUserDevices } from "@/lib/services/remnawave";

export async function POST() {
  try {
    const session = await requireApiSession();

    try {
      enforceRateLimit({
        key: `device-delete-all:${session.userId}`,
        max: 3,
        windowMs: 60 * 60 * 1000
      });
    } catch (error) {
      if (error instanceof RateLimitExceededError) {
        return apiError("Слишком частая массовая отвязка устройств.", 429);
      }
      throw error;
    }

    const user = await getUserById(session.userId);

    if (!user?.remnawaveUuid) {
      return apiError("Подписка не привязана к панели", 400);
    }

    const result = await deleteAllUserDevices(user.remnawaveUuid);
    return apiOk({ total: result.total });
  } catch (error) {
    return apiErrorFrom(error, "Не удалось удалить устройства");
  }
}
