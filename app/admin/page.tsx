import nextDynamic from "next/dynamic";

import { AdminOverviewBlocks } from "@/components/blocks/admin/admin-overview-blocks";
import { ScreenHeader } from "@/components/shell/screen-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminStats, getRevenueChartData } from "@/lib/services/stats";

export const dynamic = "force-dynamic";

const RevenueChart = nextDynamic(
  () => import("@/components/admin/revenue-chart").then((module) => module.RevenueChart),
  {
    loading: () => <Skeleton className="h-[260px] w-full md:h-[300px]" />
  }
);

export default async function AdminDashboardPage() {
  const [stats, chart] = await Promise.all([getAdminStats(), getRevenueChartData()]);

  return (
    <div className="grid gap-4 sm:gap-6">
      <ScreenHeader
        eyebrow="Админка"
        title="Обзор"
        description="Ключевые KPI, финансовый срез и ближайший операционный фокус без desktop-heavy перегруза."
      />
      <AdminOverviewBlocks stats={stats} />

      <Card>
        <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-4">
          <CardTitle className="text-lg text-white sm:text-xl">Доход по дням за 30 дней</CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
          <RevenueChart data={chart} />
        </CardContent>
      </Card>
    </div>
  );
}
