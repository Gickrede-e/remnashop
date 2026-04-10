import { ScreenHeader } from "@/components/shell/screen-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="routeStatePage">
      <Card className="surface-feature">
        <CardHeader>
          <ScreenHeader
            eyebrow="Админ-панель"
            title="Загружаем раздел"
            description="Поднимаем сводку, таблицы и служебные действия админки."
          />
        </CardHeader>
        <CardContent className="routeStatePanelBody">
          <div className="routeStateMetricsGrid routeStateMetricsGridWide">
            <Skeleton className="routeStateMetricSkeleton" />
            <Skeleton className="routeStateMetricSkeleton" />
            <Skeleton className="routeStateMetricSkeleton" />
            <Skeleton className="routeStateMetricSkeleton" />
          </div>
        </CardContent>
      </Card>
      <Skeleton className="routeStateCanvas routeStateCanvasWide" />
    </div>
  );
}
