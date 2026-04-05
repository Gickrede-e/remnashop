import { Suspense } from "react";
import nextDynamic from "next/dynamic";
import { ClipboardList, CreditCard, UserCog, Users } from "lucide-react";

import {
  AdminOverviewBlocks,
  AdminProviderStatusFallback,
  AdminProviderStatusSection
} from "@/components/blocks/admin/admin-overview-blocks";
import { ScreenHeader } from "@/components/shell/screen-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getProviderStatuses } from "@/lib/services/provider-status";
import { getAdminStats, getRevenueChartData } from "@/lib/services/stats";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

const RevenueChart = nextDynamic(
  () => import("@/components/admin/revenue-chart").then((module) => module.RevenueChart),
  {
    loading: RevenueChartFallback
  }
);

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();

  return (
    <div className="grid gap-4 sm:gap-6">
      <ScreenHeader
        eyebrow="Админка"
        title="Обзор"
        description="Основные показатели, финансы и быстрые действия — всё на одном экране."
      />
      <AdminOverviewBlocks
        summaryTitle="Ключевой срез"
        summaryDescription="Основные показатели по выручке, пользователям и активным подпискам."
        primaryMetrics={[
          { label: "Доход сегодня", value: formatPrice(stats.revenueToday), hint: "Самый быстрый сигнал по текущему дню." },
          { label: "Активные подписки", value: String(stats.activeSubscriptions), hint: "Текущее число пользователей с доступом." },
          { label: "Пользователи", value: String(stats.totalUsers), hint: "Всего зарегистрированных аккаунтов." },
          { label: "Конверсия", value: `${stats.conversion}%`, hint: "Доля пользователей, дошедших до оплаты." }
        ]}
        contextRows={[
          { label: "Доход за неделю", value: formatPrice(stats.revenueWeek) },
          { label: "Доход за месяц", value: formatPrice(stats.revenueMonth) },
          { label: "Доход за всё время", value: formatPrice(stats.revenueTotal) }
        ]}
        sections={[
          {
            title: "Фокус по выручке",
            description: "Детальная статистика по выручке за разные периоды.",
            items: [
              { label: "За неделю", value: formatPrice(stats.revenueWeek) },
              { label: "За месяц", value: formatPrice(stats.revenueMonth) },
              { label: "За всё время", value: formatPrice(stats.revenueTotal) }
            ]
          }
        ]}
        providerStatusSlot={
          <Suspense fallback={<AdminProviderStatusFallback />}>
            <AdminProviderStatusBlock />
          </Suspense>
        }
        quickActions={[
          {
            href: "/admin/users",
            label: "Пользователи",
            description: "Открыть список пользователей, синхронизацию и ручную выдачу подписок.",
            icon: Users
          },
          {
            href: "/admin/payments",
            label: "Платежи",
            description: "Перейти к незавершённым операциям и ручной проверке платёжных статусов.",
            icon: CreditCard
          },
          {
            href: "/admin/referrals",
            label: "Рефералы",
            description: "Посмотреть воронку приглашений и начисленные награды.",
            icon: UserCog
          },
          {
            href: "/admin/logs",
            label: "Логи",
            description: "Проверить действия админов и служебные события без поиска по коду.",
            icon: ClipboardList
          }
        ]}
        chart={
          <Suspense fallback={<RevenueChartFallback />}>
            <AdminRevenueChart />
          </Suspense>
        }
      />
    </div>
  );
}

async function AdminRevenueChart() {
  const chart = await getRevenueChartData();

  return <RevenueChart data={chart} />;
}

async function AdminProviderStatusBlock() {
  const providerStatuses = await getProviderStatuses();

  return <AdminProviderStatusSection statuses={providerStatuses} />;
}

function RevenueChartFallback() {
  return <Skeleton className="h-[260px] w-full md:h-[300px]" />;
}
