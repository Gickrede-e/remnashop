import { PromoForm } from "@/components/admin/promo-form";
import { ScreenHeader } from "@/components/shell/screen-header";
import { getAllPlans } from "@/lib/services/plans";

export const dynamic = "force-dynamic";

export default async function AdminNewPromoPage() {
  const plans = await getAllPlans();
  return (
    <div className="adminWorkspacePage adminWorkspace adminSurfacePage adminSurfacePageForm">
      <ScreenHeader
        eyebrow="Админка"
        title="Новый промокод"
        description="Форма разбита на отдельные правила скидки, окно активации и применимость к тарифам."
      />
      <PromoForm mode="create" plans={plans} />
    </div>
  );
}
