import { requireApiAdminSession } from "@/lib/api-session";
import { apiErrorFrom, apiOk, parseRequestBody } from "@/lib/http";
import { planSchema } from "@/lib/schemas/plans";
import { logAdminAction } from "@/lib/services/admin-logs";
import { createPlan, getAllPlans } from "@/lib/services/plans";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireApiAdminSession();
    return apiOk(await getAllPlans());
  } catch (error) {
    return apiErrorFrom(error, "Не удалось получить тарифы");
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiAdminSession();
    const body = await parseRequestBody(request, planSchema);
    const plan = await createPlan(body);
    await logAdminAction({
      adminId: session.userId,
      action: "CREATE_PLAN",
      targetType: "PLAN",
      targetId: plan.id,
      details: {
        slug: body.slug,
        isActive: body.isActive
      }
    });
    return apiOk(plan, 201);
  } catch (error) {
    return apiErrorFrom(error, "Не удалось создать тариф");
  }
}
