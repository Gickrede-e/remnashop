import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { getAdminStats, getRevenueChartData } from "@/lib/services/stats";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

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
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">Админка</p>
        <h1 className="text-4xl font-semibold text-white">Дашборд GickVPN</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <Card key={item.label}>
            <CardHeader>
              <CardTitle className="text-base text-zinc-300">{item.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold text-white">{item.value}</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Доход по дням за 30 дней</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart data={chart} />
        </CardContent>
      </Card>
    </div>
  );
}
