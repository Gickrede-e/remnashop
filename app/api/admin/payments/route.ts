import { requireApiAdminSession } from "@/lib/api-session";
import { apiError, apiOk, getPagination } from "@/lib/http";
import { getAdminPayments } from "@/lib/services/stats";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireApiAdminSession();
    const url = new URL(request.url);
    const pagination = getPagination(url.searchParams);
    return apiOk(
      await getAdminPayments({
        page: pagination.page,
        limit: pagination.limit,
        status: url.searchParams.get("status") ?? undefined,
        provider: url.searchParams.get("provider") ?? undefined
      })
    );
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Не удалось получить платежи", 400);
  }
}
