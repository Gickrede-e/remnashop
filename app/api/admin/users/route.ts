import { requireApiAdminSession } from "@/lib/api-session";
import { apiError, apiOk, getPagination } from "@/lib/http";
import { getAdminUsers } from "@/lib/services/stats";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireApiAdminSession();
    const url = new URL(request.url);
    const pagination = getPagination(url.searchParams);
    const search = url.searchParams.get("search") ?? undefined;
    return apiOk(
      await getAdminUsers({
        page: pagination.page,
        limit: pagination.limit,
        search
      })
    );
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Не удалось получить пользователей", 400);
  }
}
