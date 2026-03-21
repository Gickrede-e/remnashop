import type { ComponentProps } from "react";
import Link from "next/link";
import { CreditCard, ExternalLink, Share2 } from "lucide-react";

import { SubscriptionStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function getSubscriptionMessage(subscription: DashboardOverviewBlocksProps["subscription"]) {
  if (!subscription) {
    return "Оформите первую подписку, чтобы получить доступ и ссылку для подключения без лишних шагов.";
  }

  if (subscription.status === "ACTIVE") {
    return "Доступ активен. Ниже собраны продление и быстрый переход к subscription URL.";
  }

  if (subscription.status === "PENDING") {
    return "Активация ещё обрабатывается. Проверьте статус и при необходимости повторите покупку.";
  }

  if (subscription.status === "EXPIRED") {
    return "Срок доступа закончился. Продлите подписку, чтобы восстановить подключение.";
  }

  return "Доступ сейчас отключён. Обновите подписку и проверьте ссылку для подключения.";
}

function SubscriptionSnapshot({ subscription, externalSubscriptionUrl }: Pick<DashboardOverviewBlocksProps, "subscription" | "externalSubscriptionUrl">) {
  return (
    <Card className="surface-feature">
      <CardHeader className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm text-zinc-400">Текущий доступ</p>
            <CardTitle className="text-[1.6rem] leading-tight text-white sm:text-3xl">
              {subscription?.planName ?? "Подписка не оформлена"}
            </CardTitle>
          </div>
          {subscription ? (
            <SubscriptionStatusBadge status={subscription.status} />
          ) : (
            <span className="inline-flex h-8 w-fit items-center rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-zinc-300">
              Нет подписки
            </span>
          )}
        </div>
        <p className="max-w-xl text-sm leading-6 text-zinc-300">{getSubscriptionMessage(subscription)}</p>
      </CardHeader>

      <CardContent className="grid gap-4 p-5 pt-0 sm:p-6 sm:pt-0">
        {subscription ? (
          <div className="surface-soft grid gap-3 p-4">
            <OverviewRow label="Доступ до" value={formatDateTime(subscription.expiresAt)} />
            <OverviewRow label="Лимит трафика" value={formatBytes(subscription.trafficLimitBytes)} />
            <OverviewRow label="Использовано" value={formatBytes(subscription.trafficUsedBytes)} />
          </div>
        ) : (
          <div className="surface-soft p-4 text-sm leading-6 text-zinc-300">
            После оплаты здесь появятся срок действия, лимит трафика и статус доступа.
          </div>
        )}

        <div className="grid gap-3">
          <Button asChild className="w-full justify-between">
            <Link href="/dashboard/buy">
              {subscription ? "Продлить подписку" : "Купить подписку"}
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
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/8 pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="text-right text-sm font-medium text-white">{value}</span>
    </div>
  );
}

function ReferralAccess({ referralLink }: Pick<DashboardOverviewBlocksProps, "referralLink">) {
  return (
    <Card>
      <CardHeader className="space-y-2 p-5 pb-3 sm:p-6 sm:pb-4">
        <CardTitle className="text-lg text-white sm:text-xl">Рефералы</CardTitle>
        <p className="text-sm leading-6 text-zinc-400">Скопируйте ссылку для приглашений и откройте панель наград.</p>
      </CardHeader>
      <CardContent className="grid gap-4 p-5 pt-0 sm:p-6 sm:pt-0">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-200">
          <p className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-500">Реферальная ссылка</p>
          <p className="break-all">{referralLink || "Ссылка появится после загрузки профиля."}</p>
        </div>
        <Button asChild variant="secondary" className="w-full justify-between sm:w-auto">
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
    <div className="grid gap-4 sm:gap-5">
      <SubscriptionSnapshot subscription={props.subscription} externalSubscriptionUrl={props.externalSubscriptionUrl} />
      <ReferralAccess referralLink={props.referralLink} />
    </div>
  );
}
