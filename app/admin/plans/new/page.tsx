import { PlanForm } from "@/components/admin/plan-form";
import { ScreenHeader } from "@/components/shell/screen-header";

export default function AdminNewPlanPage() {
  return (
    <div className="grid gap-4 sm:gap-6">
      <ScreenHeader
        eyebrow="Админка"
        title="Новый тариф"
        description="Форма разбита на короткие секции: идентичность, цена, лимиты и параметры выдачи."
      />
      <PlanForm mode="create" />
    </div>
  );
}
