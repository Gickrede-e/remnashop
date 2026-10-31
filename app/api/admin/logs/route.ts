import { requireApiAdminSession } from "@/lib/api-session";
import { apiErrorFrom, apiOk, getPagination } from "@/lib/http";
import { getAdminLogs } from "@/lib/services/admin-logs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireApiAdminSession();
    const url = new URL(request.url);
    const pagination = getPagination(url.searchParams);
    return apiOk(
      await getAdminLogs({
        page: pagination.page,
        limit: pagination.limit,
        action: url.searchParams.get("action") ?? undefined,
        adminId: url.searchParams.get("adminId") ?? undefined
      })
    );
  } catch (error) {
    return apiErrorFrom(error, "Не удалось получить журнал");
  }
}
