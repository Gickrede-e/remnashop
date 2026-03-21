import nextDynamic from "next/dynamic";
import { ClipboardList, CreditCard, UserCog, Users } from "lucide-react";

import { AdminOverviewBlocks } from "@/components/blocks/admin/admin-overview-blocks";
import { ScreenHeader } from "@/components/shell/screen-header";
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

  return (
    <div className="grid gap-4 sm:gap-6">
      <ScreenHeader
        eyebrow="Админка"
        title="Обзор"
        description="Ключевые KPI, финансовый срез и ближайший операционный фокус без desktop-heavy перегруза."
      />
      <AdminOverviewBlocks
        summaryTitle="Ключевой срез"
        summaryDescription="Основные показатели по выручке, пользователям и активным подпискам без desktop-heavy перегруза."
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
            description: "Держим быстрый финансовый контекст рядом с KPI, но не в первом экране.",
            items: [
              { label: "За неделю", value: formatPrice(stats.revenueWeek) },
              { label: "За месяц", value: formatPrice(stats.revenueMonth) },
              { label: "За всё время", value: formatPrice(stats.revenueTotal) }
            ]
          },
          {
            title: "Что проверять дальше",
            description: "Операционные зоны, куда чаще всего нужно проваливаться после overview.",
            items: [
              { label: "Пользователи", value: "Синхронизация и ручная выдача доступа", hint: "Идите сюда, если нужно вмешательство по аккаунту." },
              { label: "Платежи", value: "Pending и ручная проверка статусов", hint: "Здесь же быстрый переход к refresh-операциям." },
              { label: "Логи", value: "Проверка действий и системных изменений", hint: "Удобно для сверки спорных кейсов." }
            ]
          }
        ]}
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
            description: "Перейти к pending-операциям и ручной проверке платёжных статусов.",
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
        chart={<RevenueChart data={chart} />}
      />
    </div>
  );
}
