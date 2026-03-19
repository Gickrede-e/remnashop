import { PromoForm } from "@/components/admin/promo-form";
import { getAllPlans } from "@/lib/services/plans";

export const dynamic = "force-dynamic";

export default async function AdminNewPromoPage() {
  const plans = await getAllPlans();
  return <PromoForm mode="create" plans={plans} />;
}
