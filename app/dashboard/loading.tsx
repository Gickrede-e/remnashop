import { ScreenHeader } from "@/components/shell/screen-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="routeStatePage">
      <Card className="surface-feature">
        <CardHeader>
          <ScreenHeader
            eyebrow="Личный кабинет"
            title="Загружаем раздел"
            description="Подготавливаем данные кабинета и быстрые действия."
          />
        </CardHeader>
        <CardContent className="routeStatePanelBody">
          <Skeleton className="routeStateLineSkeleton" />
          <Skeleton className="routeStateRowSkeleton" />
          <Skeleton className="routeStateRowSkeleton" />
        </CardContent>
      </Card>
      <Skeleton className="routeStateCanvas" />
    </div>
  );
}
