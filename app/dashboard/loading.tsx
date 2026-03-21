import { ScreenHeader } from "@/components/shell/screen-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="grid gap-6">
      <Card className="surface-feature">
        <CardHeader className="p-5 sm:p-6">
          <ScreenHeader
            eyebrow="Личный кабинет"
            title="Загружаем раздел"
            description="Подготавливаем данные кабинета и быстрые действия."
          />
        </CardHeader>
        <CardContent className="grid gap-4 p-5 pt-0 sm:p-6 sm:pt-0">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </CardContent>
      </Card>
      <Skeleton className="h-72 w-full rounded-[28px]" />
    </div>
  );
}
