import { requireApiSession } from "@/lib/api-session";
import { apiErrorFrom, apiOk } from "@/lib/http";
import { getMyReferralSummary } from "@/lib/services/referrals";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireApiSession();
    return apiOk(await getMyReferralSummary(session.userId));
  } catch (error) {
    return apiErrorFrom(error, "Не удалось получить реферальные данные");
  }
}
