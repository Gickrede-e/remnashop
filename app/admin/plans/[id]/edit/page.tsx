import { notFound } from "next/navigation";

import { PlanForm } from "@/components/admin/plan-form";
import { getPlanById } from "@/lib/services/plans";

export const dynamic = "force-dynamic";

export default async function AdminEditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await getPlanById(id);
  if (!plan) {
    notFound();
  }

  return (
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
        sortOrder: plan.sortOrder,
        isActive: plan.isActive
      }}
    />
  );
}
