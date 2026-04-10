import type { ComponentProps } from "react";
import Link from "next/link";
import { CreditCard, ExternalLink, History, Share2, ShieldCheck, Smartphone, Zap, Globe } from "lucide-react";

import { ReissueSubscriptionButton } from "@/components/blocks/dashboard/reissue-subscription-button";
import { SubscriptionStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
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
  remnawaveUuid: string | null;
};

function getSubscriptionMessage(subscription: DashboardOverviewBlocksProps["subscription"]) {
  if (!subscription) {
    return "Оформите первую подписку, чтобы получить доступ и ссылку для подключения без лишних шагов.";
  }

  if (subscription.status === "ACTIVE") {
    return "Доступ активен. Ниже можно продлить подписку или перейти к настройке подключения.";
  }

  if (subscription.status === "PENDING") {
    return "Активация ещё обрабатывается. Подождите пару минут и обновите страницу, прежде чем создавать новый платёж.";
  }

  if (subscription.status === "EXPIRED") {
    return "Срок доступа закончился. Продлите подписку, чтобы восстановить подключение.";
  }

  return "Доступ сейчас отключён. Обновите подписку и проверьте ссылку для подключения.";
}

function SubscriptionSnapshot({
  subscription,
  externalSubscriptionUrl,
  remnawaveUuid
}: Pick<DashboardOverviewBlocksProps, "subscription" | "externalSubscriptionUrl" | "remnawaveUuid">) {
  return (
    <section className="dashboardHero dashboardSection telemetryHero panel">
      <div className="telemetryHeroHeader">
        <div className="telemetryHeroCopy">
          <p className="telemetryPanelLabel">Текущий доступ</p>
          <h2 className="telemetryHeroTitle">{subscription?.planName ?? "Подписка не оформлена"}</h2>
          <p className="telemetryHeroDescription">{getSubscriptionMessage(subscription)}</p>
        </div>
        <div className="telemetryHeroStatus">
          {subscription ? (
            <SubscriptionStatusBadge status={subscription.status} />
          ) : (
            <span className="statusBadge statusBadgeDisabled">Нет подписки</span>
          )}
        </div>
      </div>

      <div className="telemetryGrid">
        {subscription ? (
          <>
            <TelemetryMetric label="Доступ до" value={formatDateTime(subscription.expiresAt)} />
            <TelemetryMetric label="Лимит трафика" value={formatBytes(subscription.trafficLimitBytes)} />
            <TelemetryMetric label="Использовано" value={formatBytes(subscription.trafficUsedBytes)} />
          </>
        ) : (
          <>
            {[
              { icon: ShieldCheck, label: "Срок действия", value: "После первой оплаты" },
              { icon: Zap, label: "Лимит трафика", value: "Появится в overview" },
              { icon: Globe, label: "Статус доступа", value: "Отслеживание в реальном времени" }
            ].map((item) => (
                <article key={item.label} className="telemetryMetric telemetryMetricPending">
                  <div className="telemetryMetricIcon" aria-hidden="true">
                    <item.icon className="iconSm" />
                  </div>
                <div className="telemetryMetricBody">
                  <p className="telemetryMetricLabel">{item.label}</p>
                  <p className="telemetryMetricValue">{item.value}</p>
                </div>
              </article>
            ))}
          </>
        )}
      </div>

      <div className="dashboardActionRow commandRow">
        <Button asChild className="commandButton commandButtonPrimary">
          <Link href="/dashboard/buy">
            {subscription ? "Продлить подписку" : "Купить подписку"}
            <CreditCard className="iconSm" />
          </Link>
        </Button>
        {externalSubscriptionUrl ? (
          <Button asChild variant="secondary" className="commandButton commandButtonSecondary">
            <a href={externalSubscriptionUrl} target="_blank" rel="noreferrer">
              Ссылка для подключения
              <ExternalLink className="iconSm" />
            </a>
          </Button>
        ) : null}
        {subscription?.status === "ACTIVE" && remnawaveUuid ? <ReissueSubscriptionButton /> : null}
      </div>
    </section>
  );
}

function TelemetryMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="telemetryMetric">
      <p className="telemetryMetricLabel">{label}</p>
      <p className="telemetryMetricValue">{value}</p>
    </article>
  );
}

function ReferralAccess({ referralLink }: Pick<DashboardOverviewBlocksProps, "referralLink">) {
  return (
    <section className="dashboardSection referralPanel panel">
      <div className="commandPanelSection">
        <div className="commandPanelCopy">
          <p className="telemetryPanelLabel">Рефералы</p>
          <h2 className="commandPanelTitle">Панель приглашений</h2>
          <p className="commandPanelDescription">
            Скопируйте ссылку для приглашений и откройте панель наград.
          </p>
        </div>
        <div className="referralLinkCard">
          <p className="referralLinkLabel">Реферальная ссылка</p>
          <p className="referralLinkValue">{referralLink || "Ссылка появится после загрузки профиля."}</p>
        </div>
        <div className="commandRow">
          <Button asChild variant="secondary" className="commandButton commandButtonSecondary">
            <Link href="/dashboard/referrals">
              Открыть реферальную панель
              <Share2 className="iconSm" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function DashboardShortcuts() {
  const shortcuts = [
    {
      href: "/dashboard/history",
      label: "История",
      description: "Последние оплаты и статусы операций.",
      icon: History
    },
    {
      href: "/dashboard/devices",
      label: "Устройства",
      description: "Привязанные устройства и лимиты.",
      icon: Smartphone
    },
    {
      href: "/dashboard/referrals",
      label: "Рефералы",
      description: "Ссылка приглашений и награды.",
      icon: Share2
    }
  ];

  return (
    <section className="dashboardSection panel">
      <div className="commandPanelSection">
        <div className="commandPanelCopy">
          <p className="telemetryPanelLabel">Быстрый доступ</p>
          <h2 className="commandPanelTitle">Ключевые разделы кабинета</h2>
          <p className="commandPanelDescription">
            История операций, устройства и реферальные инструменты без лишней навигации.
          </p>
        </div>
        <div className="commandRow">
          {shortcuts.map((shortcut) => (
            <Button key={shortcut.href} asChild variant="secondary" className="commandButton commandButtonSecondary">
              <Link href={shortcut.href}>
                {shortcut.label}
                <shortcut.icon className="iconSm" />
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DashboardOverviewBlocks(props: DashboardOverviewBlocksProps) {
  return (
    <div className="dashboardWorkspace dashboardOverview">
      <SubscriptionSnapshot
        subscription={props.subscription}
        externalSubscriptionUrl={props.externalSubscriptionUrl}
        remnawaveUuid={props.remnawaveUuid}
      />
      <div className="commandPanel dashboardOverviewGrid">
        <ReferralAccess referralLink={props.referralLink} />
        <DashboardShortcuts />
      </div>
    </div>
  );
}
