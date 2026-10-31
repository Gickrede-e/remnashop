import { requireApiAdminSession } from "@/lib/api-session";
import { apiErrorFrom, apiOk } from "@/lib/http";
import { getReferralAdminOverview } from "@/lib/services/referrals";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireApiAdminSession();
    return apiOk(await getReferralAdminOverview());
  } catch (error) {
    return apiErrorFrom(error, "Не удалось получить обзор рефералов");
  }
}
