import { requireApiAdminSession } from "@/lib/api-session";
import { apiError, apiOk, parseRequestBody } from "@/lib/http";
import { planSchema } from "@/lib/schemas/plans";
import { logAdminAction } from "@/lib/services/admin-logs";
import { deactivatePlan, restorePlan, updatePlan } from "@/lib/services/plans";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const session = await requireApiAdminSession();
    const body = await parseRequestBody(request, planSchema);
    const plan = await updatePlan(id, body);
    await logAdminAction({
      adminId: session.userId,
      action: "UPDATE_PLAN",
      targetType: "PLAN",
      targetId: id,
      details: {
        slug: body.slug,
        isActive: body.isActive
      }
    });
    return apiOk(plan);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Не удалось обновить тариф", 400);
  }
}

export async function POST(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    const session = await requireApiAdminSession();
    const plan = await restorePlan(id);
    await logAdminAction({
      adminId: session.userId,
      action: "RESTORE_PLAN",
      targetType: "PLAN",
      targetId: id,
      details: {
        isActive: true
      }
    });
    return apiOk(plan);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Не удалось восстановить тариф", 400);
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    const session = await requireApiAdminSession();
    const plan = await deactivatePlan(id);
    await logAdminAction({
      adminId: session.userId,
      action: "DEACTIVATE_PLAN",
      targetType: "PLAN",
      targetId: id,
      details: {
        isActive: false
      }
    });
    return apiOk(plan);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Не удалось деактивировать тариф", 400);
  }
}
