import { requireApiSession } from "@/lib/api-session";
import { apiError, apiOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getUserById } from "@/lib/services/auth";
import { revokeRemnawaveSubscription } from "@/lib/services/remnawave";

export async function POST() {
  try {
    const session = await requireApiSession();
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
    const status = error instanceof Error && "status" in error ? Number(error.status) : 400;
    return apiError(error instanceof Error ? error.message : "Не удалось перевыпустить подписку", status);
  }
}
