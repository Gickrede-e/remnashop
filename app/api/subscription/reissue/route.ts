import { requireApiSession } from "@/lib/api-session";
import { apiError, apiErrorFrom, apiOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { RateLimitExceededError, enforceRateLimit } from "@/lib/server/rate-limit";
import { getUserById } from "@/lib/services/auth";
import { revokeRemnawaveSubscription } from "@/lib/services/remnawave";

export async function POST() {
  try {
    const session = await requireApiSession();

    try {
      enforceRateLimit({
        key: `reissue:${session.userId}`,
        max: 2,
        windowMs: 24 * 60 * 60 * 1000
      });
    } catch (error) {
      if (error instanceof RateLimitExceededError) {
        return apiError("Слишком частые перевыпуски. Попробуйте через сутки.", 429);
      }
      throw error;
    }

    const user = await getUserById(session.userId);

    if (!user?.remnawaveUuid) {
      return apiError("Подписка не привязана к панели", 400);
    }

    const snapshot = await revokeRemnawaveSubscription(user.remnawaveUuid);

    if (snapshot.shortUuid) {
      await prisma.user.update({
        where: { id: user.id },
        data: { remnawaveShortUuid: snapshot.shortUuid }
      });
    }

    return apiOk({
      subscriptionUrl: snapshot.subscriptionUrl
    });
  } catch (error) {
    return apiErrorFrom(error, "Не удалось перевыпустить подписку");
  }
}
