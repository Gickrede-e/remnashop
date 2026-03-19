import { requireApiAdminSession } from "@/lib/api-session";
import { apiError, apiOk, getPagination } from "@/lib/http";
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
    return apiError(error instanceof Error ? error.message : "Не удалось получить журнал", 400);
  }
}
