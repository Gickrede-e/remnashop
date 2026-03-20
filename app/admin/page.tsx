import nextDynamic from "next/dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminStats, getRevenueChartData } from "@/lib/services/stats";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

const RevenueChart = nextDynamic(
  () => import("@/components/admin/revenue-chart").then((module) => module.RevenueChart),
  {
    loading: () => <Skeleton className="h-[260px] w-full md:h-[300px]" />
  }
);

export default async function AdminDashboardPage() {
  const [stats, chart] = await Promise.all([getAdminStats(), getRevenueChartData()]);

  const items = [
    { label: "Доход сегодня", value: formatPrice(stats.revenueToday) },
    { label: "Доход за неделю", value: formatPrice(stats.revenueWeek) },
    { label: "Доход за месяц", value: formatPrice(stats.revenueMonth) },
    { label: "Доход за всё время", value: formatPrice(stats.revenueTotal) },
    { label: "Активные подписки", value: String(stats.activeSubscriptions) },
    { label: "Пользователи", value: String(stats.totalUsers) },
    { label: "Конверсия", value: `${stats.conversion}%` }
  ];

  return (
    <div className="grid gap-6">
      <section className="surface-feature p-5 sm:p-7">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)] xl:items-end">
          <div className="space-y-3">
            <p className="section-kicker">Админка</p>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">Дашборд GickVPN</h1>
            <p className="max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
              Основные показатели продаж, активности пользователей и подписок собраны на одном экране.
            </p>
          </div>

          <div className="surface-soft grid gap-3 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-zinc-400">Активные подписки</span>
              <span className="text-base font-semibold text-white">{stats.activeSubscriptions}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-zinc-400">Пользователи</span>
              <span className="text-base font-semibold text-white">{stats.totalUsers}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-zinc-400">Конверсия</span>
              <span className="text-base font-semibold text-white">{stats.conversion}%</span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <Card key={item.label}>
            <CardHeader className="p-5 sm:p-6">
              <CardTitle className="text-base text-zinc-300">{item.label}</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 text-3xl font-semibold text-white sm:p-6 sm:pt-0">{item.value}</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="p-5 sm:p-6">
          <CardTitle>Доход по дням за 30 дней</CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
          <RevenueChart data={chart} />
        </CardContent>
      </Card>
    </div>
  );
}
