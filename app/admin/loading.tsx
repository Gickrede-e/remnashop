import { ScreenHeader } from "@/components/shell/screen-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="grid gap-6">
      <Card className="surface-feature">
        <CardHeader className="p-5 sm:p-6">
          <ScreenHeader
            eyebrow="Админ-панель"
            title="Загружаем раздел"
            description="Поднимаем сводку, таблицы и служебные действия админки."
          />
        </CardHeader>
        <CardContent className="grid gap-4 p-5 pt-0 sm:p-6 sm:pt-0">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
      <Skeleton className="h-96 w-full rounded-[28px]" />
    </div>
  );
}
