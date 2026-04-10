import Link from "next/link";
import {
  CalendarClock,
  Gauge,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal
} from "lucide-react";

import { DashboardCard } from "@/components/blocks/dashboard/dashboard-card";
import { DashboardStatTile } from "@/components/blocks/dashboard/dashboard-stat-tile";
import { formatBytes, formatDateTime } from "@/lib/utils";

type SubscriptionStatus = "ACTIVE" | "PENDING" | "EXPIRED" | "DISABLED" | "CANCELED";

type RecentPayment = {
  id: string;
  userInitial: string;
  userLabel: string;
  createdAt: Date;
  status: "completed" | "pending" | "process" | "failed";
};

type DashboardOverviewBlocksProps = {
  subscription: {
    status: SubscriptionStatus;
    planName: string | null;
    expiresAt: Date | null;
    trafficLimitBytes: bigint | null;
    trafficUsedBytes: bigint | null;
  } | null;
  recentPayments: RecentPayment[];
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

const PAYMENT_STATUS_LABELS: Record<RecentPayment["status"], string> = {
  completed: "Оплачен",
  pending: "Ожидает",
  process: "В обработке",
  failed: "Ошибка"
};

const quickActions = [
  { href: "/dashboard/buy", label: "Купить подписку", stateClassName: "is-completed" },
  { href: "/dashboard/devices", label: "Управлять устройствами", stateClassName: "is-not-completed" },
  { href: "/dashboard/referrals", label: "Пригласить друга", stateClassName: "is-completed" }
] as const;

function getSubscriptionStatusValue(subscription: DashboardOverviewBlocksProps["subscription"]) {
  if (!subscription) {
    return "Не оформлена";
  }

  return SUBSCRIPTION_STATUS_LABELS[subscription.status] ?? "Отключена";
}

function DashboardStatusPill({ status }: { status: RecentPayment["status"] }) {
  return <span className={`dashStatusPill is-${status}`}>{PAYMENT_STATUS_LABELS[status]}</span>;
}

export function DashboardOverviewBlocks({
  subscription,
  recentPayments,
  referralLink,
  externalSubscriptionUrl,
  remnawaveUuid
}: DashboardOverviewBlocksProps) {
  void referralLink;
  void externalSubscriptionUrl;
  void remnawaveUuid;

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
        <DashboardCard
          title="Последние операции"
          className="dashCardWide"
          actions={
            <>
              <button type="button" aria-label="Поиск операций">
                <Search aria-hidden="true" />
              </button>
              <button type="button" aria-label="Фильтр операций">
                <SlidersHorizontal aria-hidden="true" />
              </button>
            </>
          }
        >
          <table className="dashTable">
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Дата</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={3}>Платежей пока нет.</td>
                </tr>
              ) : (
                recentPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <div className="dashTableLead">
                        <span className="dashTableAvatar">{payment.userInitial}</span>
                        <span>{payment.userLabel}</span>
                      </div>
                    </td>
                    <td>{formatDateTime(payment.createdAt)}</td>
                    <td>
                      <DashboardStatusPill status={payment.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DashboardCard>

        <DashboardCard
          title="Быстрые действия"
          className="dashCardNarrow"
          actions={
            <button type="button" aria-label="Добавить действие">
              <Plus aria-hidden="true" />
            </button>
          }
        >
          <ul className="dashList">
            {quickActions.map((action) => (
              <li key={action.href} className={`dashListItem ${action.stateClassName}`}>
                <Link href={action.href}>{action.label}</Link>
                <Plus className="dashListIcon" aria-hidden="true" />
              </li>
            ))}
          </ul>
        </DashboardCard>
      </div>
    </div>
  );
}
