import { notFound } from "next/navigation";

import { PlanForm } from "@/components/admin/plan-form";
import { ScreenHeader } from "@/components/shell/screen-header";
import { getPlanById } from "@/lib/services/plans";

export const dynamic = "force-dynamic";

export default async function AdminEditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await getPlanById(id);
  if (!plan) {
    notFound();
  }

  return (
    <div className="adminWorkspacePage adminWorkspace adminSurfacePage adminSurfacePageForm">
      <ScreenHeader
        eyebrow="Админка"
        title={`Тариф: ${plan.name}`}
        description="Редактирование собрано в отдельные короткие блоки, чтобы быстрее проверять цену, лимиты и Remnawave-параметры."
      />
      <PlanForm
        mode="edit"
        planId={plan.id}
        initialValues={{
          slug: plan.slug,
          name: plan.name,
          description: plan.description,
          durationDays: plan.durationDays,
          trafficGB: plan.trafficGB,
          priceRubles: plan.price / 100,
          highlight: plan.highlight,
          remnawaveExternalSquadUuid: plan.remnawaveExternalSquadUuid,
          remnawaveInternalSquadUuids: plan.remnawaveInternalSquadUuids,
          remnawaveHwidDeviceLimit: plan.remnawaveHwidDeviceLimit?.toString() ?? "",
          sortOrder: plan.sortOrder,
          isActive: plan.isActive
        }}
      />
    </div>
  );
}
