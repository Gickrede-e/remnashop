import Link from "next/link";
import {
  CalendarClock,
  Gauge,
  ShieldCheck
} from "lucide-react";

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

function getSubscriptionStatusValue(subscription: DashboardOverviewBlocksProps["subscription"]) {
  if (!subscription) {
    return "Не оформлена";
  }

  return SUBSCRIPTION_STATUS_LABELS[subscription.status] ?? "Отключена";
}

export function DashboardOverviewBlocks({
  subscription,
  referralLink,
  externalSubscriptionUrl,
  remnawaveUuid
}: DashboardOverviewBlocksProps) {
  void referralLink;
  void remnawaveUuid;

  const quickActions: QuickAction[] = [
    externalSubscriptionUrl
      ? {
          href: externalSubscriptionUrl,
          label: "Открыть подписку",
          stateClassName: "is-completed",
          external: true
        }
      : { href: "/dashboard/buy", label: "Купить подписку", stateClassName: "is-completed" },
    { href: "/dashboard/referrals", label: "Пригласить друга", stateClassName: "is-completed" }
  ];

  return (
    <div className="dashWorkspace dashOverview">
      <div className="dashStatGrid">
        <DashboardStatTile icon={ShieldCheck} label="СТАТУС" value={getSubscriptionStatusValue(subscription)} />
        <DashboardStatTile
          icon={CalendarClock}
          label="ДОСТУП ДО"
          value={subscription ? formatDateTime(subscription.expiresAt) : "—"}
        />
        <DashboardStatTile
          icon={Gauge}
          label="ТРАФИК"
          value={
            subscription
              ? `${formatBytes(subscription.trafficUsedBytes)} / ${formatBytes(subscription.trafficLimitBytes)}`
              : "—"
          }
        />
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
