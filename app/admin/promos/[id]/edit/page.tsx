import { notFound } from "next/navigation";

import { PromoForm } from "@/components/admin/promo-form";
import { ScreenHeader } from "@/components/shell/screen-header";
import { getAllPlans } from "@/lib/services/plans";
import { listPromoCodes } from "@/lib/services/promos";

export const dynamic = "force-dynamic";

export default async function AdminEditPromoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [plans, promos] = await Promise.all([getAllPlans(), listPromoCodes()]);
  const promo = promos.find((item) => item.id === id);
  if (!promo) {
    notFound();
  }

  return (
    <div className="adminWorkspacePage adminWorkspace adminSurfacePage adminSurfacePageForm">
      <ScreenHeader
        eyebrow="Админка"
        title={`Промокод: ${promo.code}`}
        description="Редактирование разделено на небольшие секции, чтобы быстро проверить тип, лимиты и окно действия."
      />
      <PromoForm
        mode="edit"
        promoId={promo.id}
        plans={plans}
        initialValues={{
          code: promo.code,
          type: promo.type,
          value: promo.value,
          maxUsages: promo.maxUsages,
          maxUsagesPerUser: promo.maxUsagesPerUser,
          minAmount: promo.minAmount,
          applicablePlanIds: promo.applicablePlanIds,
          startsAt: promo.startsAt.toISOString().slice(0, 16),
          expiresAt: promo.expiresAt ? promo.expiresAt.toISOString().slice(0, 16) : "",
          isActive: promo.isActive
        }}
      />
    </div>
  );
}
