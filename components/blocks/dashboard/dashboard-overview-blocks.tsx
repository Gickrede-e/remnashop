import Link from "next/link";
import { CalendarClock, Gauge, ShieldCheck } from "lucide-react";

import { DashboardCard } from "@/components/blocks/dashboard/dashboard-card";
import { ReissueSubscriptionButton } from "@/components/blocks/dashboard/reissue-subscription-button";
import { DashboardStatTile } from "@/components/blocks/dashboard/dashboard-stat-tile";
import { formatBytes, formatDateTime } from "@/lib/utils";

type SubscriptionStatus = "ACTIVE" | "PENDING" | "EXPIRED" | "DISABLED" | "CANCELED";

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
  remnawaveUuid: string | null;
};

const SUBSCRIPTION_STATUS_LABELS: Record<Exclude<SubscriptionStatus, "CANCELED">, string> & { CANCELED: string } = {
  ACTIVE: "Активна",
  PENDING: "Ожидает",
  EXPIRED: "Истекла",
  DISABLED: "Отключена",
  CANCELED: "Отключена"
};

type QuickAction = {
  href: string;
  label: string;
  stateClassName: string;
  external?: boolean;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function getSubscriptionStatusValue(subscription: DashboardOverviewBlocksProps["subscription"]) {
  if (!subscription) {
    return "Не оформлена";
  }

  return SUBSCRIPTION_STATUS_LABELS[subscription.status] ?? "Отключена";
}

function formatDayCount(days: number) {
  const absDays = Math.abs(days) % 100;
  const lastDigit = absDays % 10;

  if (absDays >= 11 && absDays <= 19) {
    return `${days} дней`;
  }

  if (lastDigit === 1) {
    return `${days} день`;
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${days} дня`;
  }

  return `${days} дней`;
}

function getSubscriptionRemainingDaysValue(subscription: DashboardOverviewBlocksProps["subscription"]) {
  if (!subscription?.expiresAt) {
    return "—";
  }

  const remainingDays = Math.max(0, Math.ceil((subscription.expiresAt.getTime() - Date.now()) / DAY_IN_MS));
  return formatDayCount(remainingDays);
}

export function DashboardOverviewBlocks({
  subscription,
  referralLink,
  externalSubscriptionUrl,
  remnawaveUuid
}: DashboardOverviewBlocksProps) {
  void referralLink;

  const subscriptionStatus = getSubscriptionStatusValue(subscription);
  const subscriptionExpiresAt = subscription ? formatDateTime(subscription.expiresAt) : "—";
  const subscriptionTraffic = subscription
    ? `${formatBytes(subscription.trafficUsedBytes)} / ${formatBytes(subscription.trafficLimitBytes)}`
    : "—";
  const subscriptionRemainingDays = getSubscriptionRemainingDaysValue(subscription);

  const quickActions: QuickAction[] = [
    externalSubscriptionUrl
      ? {
          href: externalSubscriptionUrl,
          label: "Подключить",
          stateClassName: "is-completed",
          external: true
        }
      : { href: "/dashboard/buy", label: "Купить подписку", stateClassName: "is-completed" },
    { href: "/dashboard/referrals", label: "Пригласить друга", stateClassName: "is-completed" }
  ];

  return (
    <div className="dashWorkspace dashOverview">
      <div className="dashStatGrid">
        <DashboardStatTile icon={ShieldCheck} label="СТАТУС" value={subscriptionStatus} />
        <DashboardStatTile icon={CalendarClock} label="ДОСТУП ДО" value={subscriptionExpiresAt} />
        <DashboardStatTile icon={Gauge} label="ТРАФИК" value={subscriptionTraffic} />
      </div>

      <div className="dashOverviewCompactStats" aria-label="Краткая сводка подписки">
        <article className="dashOverviewCompactStat">
          <p className="dashOverviewCompactStatValue">{subscriptionStatus}</p>
          <p className="dashOverviewCompactStatLabel">Статус</p>
        </article>
        <article className="dashOverviewCompactStat">
          <p className="dashOverviewCompactStatValue">{subscriptionTraffic}</p>
          <p className="dashOverviewCompactStatLabel">Трафик</p>
        </article>
        <article className="dashOverviewCompactStat">
          <p className="dashOverviewCompactStatValue">{subscriptionRemainingDays}</p>
          <p className="dashOverviewCompactStatLabel">Осталось</p>
        </article>
      </div>

      <div className="dashCardGrid">
        <DashboardCard className="dashCardNarrow">
          <ul className="dashList">
            {quickActions.map((action) => (
              <li key={action.href} className={`dashListItem ${action.stateClassName}`}>
                {action.external ? (
                  <a href={action.href} target="_blank" rel="noreferrer">
                    {action.label}
                  </a>
                ) : (
                  <Link href={action.href}>{action.label}</Link>
                )}
              </li>
            ))}
            {remnawaveUuid ? (
              <li className="dashListItem is-not-completed">
                <ReissueSubscriptionButton className="dashListButton" />
              </li>
            ) : null}
          </ul>
        </DashboardCard>
      </div>
    </div>
  );
}
