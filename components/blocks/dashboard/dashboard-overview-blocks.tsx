import Link from "next/link";
import { ArrowRight, ChevronRight, Gauge, ShieldCheck } from "lucide-react";

import { DashboardCard } from "@/components/blocks/dashboard/dashboard-card";
import { ReissueSubscriptionButton } from "@/components/blocks/dashboard/reissue-subscription-button";
import { DashboardStatTile } from "@/components/blocks/dashboard/dashboard-stat-tile";
import { CubeField } from "@/components/effects/cube-field";
import { formatBytes, formatDayCount, pluralizeDays } from "@/lib/utils";

type SubscriptionStatus = "ACTIVE" | "PENDING" | "EXPIRED" | "DISABLED" | "CANCELED";

type SubscriptionSummary = {
  status: SubscriptionStatus;
  planName: string | null;
  expiresAt: Date | null;
  trafficLimitBytes: bigint | null;
  trafficUsedBytes: bigint | null;
} | null;

type SubscriptionState = "none" | "active" | "ending" | "expired";

type DashboardOverviewBlocksProps = {
  subscription: SubscriptionSummary;
  externalSubscriptionUrl: string | null;
  remnawaveUuid: string | null;
  /** Дней за приглашённого друга, если программа платит днями (см. env.referralBonusDays). */
  referralBonusDays: number | null;
};

const SUBSCRIPTION_STATUS_LABELS: Record<Exclude<SubscriptionStatus, "CANCELED">, string> & { CANCELED: string } = {
  ACTIVE: "Активна",
  PENDING: "Ожидает",
  EXPIRED: "Истекла",
  DISABLED: "Отключена",
  CANCELED: "Отключена"
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
// At this many days or fewer the days-left card turns red and renewal becomes the main button.
const ENDING_SOON_DAYS = 5;

const PRIMARY_BUTTON = "button buttonPrimary buttonSizeLg";
const SECONDARY_BUTTON = "button buttonSecondary buttonSizeLg";

function getSubscriptionStatusValue(subscription: SubscriptionSummary) {
  if (!subscription) {
    return "Не оформлена";
  }

  return SUBSCRIPTION_STATUS_LABELS[subscription.status] ?? "Отключена";
}

function formatDateOnly(value: Date | string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(date);
}

function getRemainingDays(expiresAt: Date | null) {
  if (!expiresAt) {
    return null;
  }

  return Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / DAY_IN_MS));
}

function getSubscriptionState(subscription: SubscriptionSummary, remainingDays: number | null): SubscriptionState {
  if (!subscription) {
    return "none";
  }

  if (subscription.status === "EXPIRED" || subscription.status === "DISABLED" || subscription.status === "CANCELED") {
    return "expired";
  }

  return remainingDays !== null && remainingDays <= ENDING_SOON_DAYS ? "ending" : "active";
}

function getTrafficMeter(subscription: SubscriptionSummary) {
  if (!subscription?.trafficLimitBytes || subscription.trafficLimitBytes <= 0n) {
    return null;
  }

  const used = Number(subscription.trafficUsedBytes ?? 0n);
  const limit = Number(subscription.trafficLimitBytes);
  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) {
    return null;
  }

  return used / limit;
}

/** Строка списка «Действия»: заголовок + подсказка + шеврон. */
function DashListRow({ title, hint }: { title: string; hint: string }) {
  return (
    <span className="dashListRow">
      <span>
        <span className="dashListRowTitle">{title}</span>
        <span className="dashListRowHint">{hint}</span>
      </span>
      <ChevronRight className="iconSm iconNoShrink dashListRowChevron" aria-hidden="true" />
    </span>
  );
}

export function DashboardOverviewBlocks({
  subscription,
  externalSubscriptionUrl,
  remnawaveUuid,
  referralBonusDays
}: DashboardOverviewBlocksProps) {
  const subscriptionStatus = getSubscriptionStatusValue(subscription);
  const subscriptionTraffic = subscription
    ? `${formatBytes(subscription.trafficUsedBytes)} / ${formatBytes(subscription.trafficLimitBytes)}`
    : "—";
  const trafficMeter = getTrafficMeter(subscription);
  const inviteHint = referralBonusDays
    ? `+${formatDayCount(referralBonusDays)} вам и другу`
    : "Бонус за каждого оплатившего друга";

  // position задаём инлайном: <cube-field> при подключении сам ставит inline
  // position:relative, если позиция не пришла инлайном, — и перебивает класс.
  const tileCubes = (
    <CubeField className="dashStatTileCubes" count={5} scale={0.42} dust={10} style={{ position: "absolute", inset: 0 }} />
  );

  return (
    <div className="dashWorkspace dashOverview">
      <DaysLeftCard subscription={subscription} externalSubscriptionUrl={externalSubscriptionUrl} />

      <div className="dashOverviewCompactStats" aria-label="Краткая сводка подписки">
        <article className="dashOverviewCompactStat">
          <p className="dashOverviewCompactStatValue">{subscriptionStatus}</p>
          <p className="dashOverviewCompactStatLabel">Статус</p>
        </article>
        <article className="dashOverviewCompactStat">
          <p className="dashOverviewCompactStatValue">{subscriptionTraffic}</p>
          <p className="dashOverviewCompactStatLabel">Трафик</p>
        </article>
      </div>

      <div className="dashOverviewGrid">
        <DashboardStatTile icon={ShieldCheck} label="СТАТУС" value={subscriptionStatus} decoration={tileCubes} />
        <DashboardStatTile
          icon={Gauge}
          label="ТРАФИК"
          value={subscriptionTraffic}
          meter={trafficMeter}
          decoration={tileCubes}
        />
        <DashboardCard>
          <div className="dashCardHead">
            <h2 className="dashCardTitle">Действия</h2>
          </div>
          <ul className="dashList">
            <li className="dashListItem">
              <Link href="/dashboard/referrals">
                <DashListRow title="Пригласить друга" hint={inviteHint} />
              </Link>
            </li>
            {remnawaveUuid ? (
              <li className="dashListItem">
                <ReissueSubscriptionButton
                  className="dashListButton"
                  label={<DashListRow title="Перевыпуск подписки" hint="Старая ссылка перестанет работать" />}
                />
              </li>
            ) : null}
          </ul>
        </DashboardCard>
      </div>
    </div>
  );
}

function DaysLeftCard({
  subscription,
  externalSubscriptionUrl
}: {
  subscription: SubscriptionSummary;
  externalSubscriptionUrl: string | null;
}) {
  const remainingDays = getRemainingDays(subscription?.expiresAt ?? null);
  const state = getSubscriptionState(subscription, remainingDays);
  const expiresDate = formatDateOnly(subscription?.expiresAt);
  const planSuffix = subscription?.planName ? ` · ${subscription.planName}` : "";

  let badge: string | null = null;
  let headline: string | null = null;
  let note: string;

  if (state === "none") {
    headline = "Подписки нет";
    note = "Выберите тариф — доступ откроется сразу после оплаты.";
  } else if (state === "expired") {
    badge = "Доступ отключён";
    headline = "Истекла";
    note = subscription?.expiresAt
      ? `Закончилась ${expiresDate}. Устройства не подключатся, пока вы не продлите подписку.`
      : "Устройства не подключатся, пока вы не продлите подписку.";
  } else if (state === "ending") {
    badge = "Скоро закончится";
    note = `Доступ закончится ${expiresDate}${planSuffix}`;
  } else {
    badge = getSubscriptionStatusValue(subscription);
    headline = remainingDays === null ? "Без срока" : null;
    note = remainingDays === null ? (subscription?.planName ?? "") : `До ${expiresDate}${planSuffix}`;
  }

  return (
    <section className={`dashDaysLeft is-${state}`} aria-label="Срок подписки" data-tour="stats">
      <div className="dashDaysLeftMain">
        {badge ? <span className="dashDaysLeftBadge">{badge}</span> : null}
        {headline || remainingDays === null ? (
          <p className="dashDaysLeftHeadline">{headline}</p>
        ) : (
          <p className="dashDaysLeftCount">
            <span className="dashDaysLeftNumber">{remainingDays}</span>
            <span className="dashDaysLeftUnit">
              {pluralizeDays(remainingDays)} {pluralizeDays(remainingDays) === "день" ? "остался" : "осталось"}
            </span>
          </p>
        )}
        {note ? <p className="dashDaysLeftNote">{note}</p> : null}
      </div>
      <div className="dashDaysLeftActions">
        <DaysLeftActions state={state} connectUrl={externalSubscriptionUrl} />
      </div>
    </section>
  );
}

// Connecting leads while the subscription runs; renewal leads once it is ending or gone.
// The tour points at "connect", so whichever button opens access carries that target.
function DaysLeftActions({ state, connectUrl }: { state: SubscriptionState; connectUrl: string | null }) {
  if (state === "active" && connectUrl) {
    return (
      <>
        <ConnectLink url={connectUrl} isPrimary />
        <BuyLink label="Продлить" />
      </>
    );
  }

  if (state === "ending") {
    return (
      <>
        <BuyLink label="Продлить сейчас" isPrimary isTourTarget={!connectUrl} />
        {connectUrl ? <ConnectLink url={connectUrl} /> : null}
      </>
    );
  }

  const buyLabel = state === "expired" ? "Возобновить подписку" : state === "none" ? "Купить подписку" : "Продлить";
  return <BuyLink label={buyLabel} isPrimary isTourTarget />;
}

function ConnectLink({ url, isPrimary = false }: { url: string; isPrimary?: boolean }) {
  return (
    <a
      className={isPrimary ? PRIMARY_BUTTON : SECONDARY_BUTTON}
      href={url}
      target="_blank"
      rel="noreferrer"
      data-tour="connect"
    >
      Подключить
      {isPrimary ? <ArrowRight className="iconSm iconNoShrink" aria-hidden="true" /> : null}
    </a>
  );
}

function BuyLink({
  label,
  isPrimary = false,
  isTourTarget = false
}: {
  label: string;
  isPrimary?: boolean;
  isTourTarget?: boolean;
}) {
  return (
    <Link
      className={isPrimary ? PRIMARY_BUTTON : SECONDARY_BUTTON}
      href="/dashboard/buy"
      data-tour={isTourTarget ? "connect" : undefined}
    >
      {label}
      {isPrimary ? <ArrowRight className="iconSm iconNoShrink" aria-hidden="true" /> : null}
    </Link>
  );
}
