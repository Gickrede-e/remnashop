import { requireApiSession } from "@/lib/api-session";
import { apiError, apiOk } from "@/lib/http";
import { getMyReferralSummary } from "@/lib/services/referrals";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireApiSession();
    return apiOk(await getMyReferralSummary(session.userId));
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Не удалось получить реферальные данные");
  }
}
