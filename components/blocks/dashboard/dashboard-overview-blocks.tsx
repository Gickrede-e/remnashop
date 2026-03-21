import type { ComponentProps } from "react";
import Link from "next/link";
import { CalendarClock, CreditCard, ExternalLink, RadioTower, Share2, ShieldCheck, type LucideIcon } from "lucide-react";

import { SubscriptionStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBytes, formatDateTime } from "@/lib/utils";

type SubscriptionStatus = ComponentProps<typeof SubscriptionStatusBadge>["status"];

type DashboardOverviewBlocksProps = {
  subscription: {
    status: SubscriptionStatus;
    planName: string | null;
    expiresAt: Date | null;
    trafficLimitBytes: bigint | null;
    trafficUsedBytes: bigint | null;
  } | null;
  referralLink: string;
  externalSubscriptionUrl: string | null;
};

function getSubscriptionTitle(subscription: DashboardOverviewBlocksProps["subscription"]) {
  if (!subscription) {
    return "Подписка не оформлена";
  }

  return subscription.planName ?? "Подписка активна";
}

function getSubscriptionMessage(subscription: DashboardOverviewBlocksProps["subscription"]) {
  if (!subscription) {
    return "Оформите доступ, чтобы получить профиль и ссылку для подключения.";
  }

  if (subscription.status === "ACTIVE") {
    return "Доступ активен. Продление и ссылка на профиль находятся ниже.";
  }

  if (subscription.status === "PENDING") {
    return "Активация обрабатывается. Если доступ не появился, откройте покупку ещё раз.";
  }

  if (subscription.status === "EXPIRED") {
    return "Срок действия закончился. Продлите доступ, чтобы восстановить подключение.";
  }

  return "Доступ сейчас отключён. Обновите подписку и проверьте ссылку профиля.";
}

function getPrimaryActionLabel(subscription: DashboardOverviewBlocksProps["subscription"]) {
  if (!subscription) {
    return "Купить подписку";
  }

  return subscription.status === "ACTIVE" ? "Продлить подписку" : "Открыть покупку";
}

function getTrafficSummary(subscription: DashboardOverviewBlocksProps["subscription"]) {
  if (!subscription) {
    return "0.0 ГБ из 0.0 ГБ";
  }

  return `${formatBytes(subscription.trafficUsedBytes)} из ${formatBytes(subscription.trafficLimitBytes)}`;
}

function StatusCard({ subscription }: Pick<DashboardOverviewBlocksProps, "subscription">) {
  return (
    <Card className="surface-feature">
      <CardHeader className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
            <ShieldCheck className="h-4 w-4" />
            Текущий статус
          </div>
          <div className="space-y-2">
            <CardTitle className="text-[1.6rem] leading-tight text-white sm:text-3xl">{getSubscriptionTitle(subscription)}</CardTitle>
            {subscription ? (
              <SubscriptionStatusBadge status={subscription.status} />
            ) : (
              <span className="inline-flex h-8 w-fit items-center rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-zinc-300">
                Нет подписки
              </span>
            )}
          </div>
          <CardDescription className="max-w-xl text-sm leading-6 text-zinc-300">
            {getSubscriptionMessage(subscription)}
          </CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}

function QuickActionsCard({
  subscription,
  externalSubscriptionUrl
}: Pick<DashboardOverviewBlocksProps, "subscription" | "externalSubscriptionUrl">) {
  return (
    <Card>
      <CardHeader className="space-y-2 p-5 pb-3 sm:p-6 sm:pb-4">
        <CardTitle className="text-lg text-white sm:text-xl">Быстрые действия</CardTitle>
        <CardDescription className="text-sm leading-6 text-zinc-400">
          Основные действия без перехода по лишним экранам.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 p-5 pt-0 sm:p-6 sm:pt-0">
        <Button asChild className="w-full justify-between">
          <Link href="/dashboard/buy">
            {getPrimaryActionLabel(subscription)}
            <CreditCard className="h-4 w-4" />
          </Link>
        </Button>
        {externalSubscriptionUrl ? (
          <Button asChild variant="secondary" className="w-full justify-between">
            <a href={externalSubscriptionUrl} target="_blank" rel="noreferrer">
              Открыть subscription URL
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-zinc-400">
            Ссылка профиля появится после синхронизации подписки.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatTile({
  icon: Icon,
  label,
  value
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-3 text-base font-medium text-white">{value}</p>
    </div>
  );
}

function StatsCard({ subscription }: Pick<DashboardOverviewBlocksProps, "subscription">) {
  return (
    <Card>
      <CardHeader className="space-y-2 p-5 pb-3 sm:p-6 sm:pb-4">
        <CardTitle className="text-lg text-white sm:text-xl">Коротко по доступу</CardTitle>
        <CardDescription className="text-sm leading-6 text-zinc-400">
          План, срок и трафик в одном блоке.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 p-5 pt-0 sm:grid-cols-3 sm:p-6 sm:pt-0">
        <StatTile icon={ShieldCheck} label="План" value={subscription?.planName ?? "Не оформлен"} />
        <StatTile icon={CalendarClock} label="Доступ до" value={formatDateTime(subscription?.expiresAt)} />
        <StatTile icon={RadioTower} label="Трафик" value={getTrafficSummary(subscription)} />
      </CardContent>
    </Card>
  );
}

function ReferralSummaryCard({ referralLink }: Pick<DashboardOverviewBlocksProps, "referralLink">) {
  return (
    <Card>
      <CardHeader className="space-y-2 p-5 pb-3 sm:p-6 sm:pb-4">
        <CardTitle className="text-lg text-white sm:text-xl">Рефералы</CardTitle>
        <CardDescription className="text-sm leading-6 text-zinc-400">
          Скопируйте ссылку и откройте список приглашений.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 p-5 pt-0 sm:p-6 sm:pt-0">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-200">
          <p className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-500">Реферальная ссылка</p>
          <p className="break-all">{referralLink || "Ссылка появится после загрузки профиля."}</p>
        </div>
        <Button asChild variant="secondary" className="w-full justify-between">
          <Link href="/dashboard/referrals">
            Открыть реферальную панель
            <Share2 className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function DashboardOverviewBlocks(props: DashboardOverviewBlocksProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
      <StatusCard subscription={props.subscription} />
      <QuickActionsCard subscription={props.subscription} externalSubscriptionUrl={props.externalSubscriptionUrl} />
      <StatsCard subscription={props.subscription} />
      <ReferralSummaryCard referralLink={props.referralLink} />
    </div>
  );
}
