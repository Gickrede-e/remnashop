import { requireApiAdminSession } from "@/lib/api-session";
import { apiError, apiOk } from "@/lib/http";
import { getReferralAdminOverview } from "@/lib/services/referrals";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireApiAdminSession();
    return apiOk(await getReferralAdminOverview());
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Не удалось получить обзор рефералов", 400);
  }
}
