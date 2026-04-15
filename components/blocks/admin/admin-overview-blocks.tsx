import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import type { ProviderStatusRow } from "@/lib/services/provider-status";
import { cn } from "@/lib/utils";

export type AdminOverviewMetric = {
  label: string;
  value: string;
  hint?: string;
};

export type AdminOverviewContextRow = {
  label: string;
  value: string;
  description?: string;
};

export type AdminOverviewSection = {
  title: string;
  description: string;
  items: AdminOverviewMetric[];
};

export type AdminOverviewAction = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

type AdminOverviewBlocksProps = {
  summaryTitle: string;
  summaryDescription: string;
  primaryMetrics: AdminOverviewMetric[];
  contextRows: AdminOverviewContextRow[];
  sections: AdminOverviewSection[];
  providerStatusSlot: ReactNode;
  quickActions: AdminOverviewAction[];
  chart?: ReactNode;
  chartTitle?: string;
  chartDescription?: string;
};

function MetricTile({ item, compact = false }: { item: AdminOverviewMetric; compact?: boolean }) {
  return (
    <article className={cn("controlMetric", compact && "controlMetricCompact")}>
      <p className="controlMetricLabel">{item.label}</p>
      <p className="controlMetricValue">{item.value}</p>
      {item.hint ? <p className="controlMetricHint">{item.hint}</p> : null}
    </article>
  );
}

function SummaryCard({
  title,
  description,
  metrics,
  rows
}: {
  title: string;
  description: string;
  metrics: AdminOverviewMetric[];
  rows: AdminOverviewContextRow[];
}) {
  return (
    <section className="adminSection controlCenterSummary panel">
      <div className="controlPanelHeader">
        <p className="controlPanelEyebrow">Ключевой срез</p>
        <h2 className="controlPanelTitle">{title}</h2>
        <p className="controlPanelDescription">{description}</p>
      </div>
      <div className="controlPanelBody">
        <div className="controlMetricGrid">
          {metrics.map((item) => (
            <MetricTile key={item.label} item={item} />
          ))}
        </div>
        <div className="controlContextList">
          {rows.map((row) => (
            <div key={row.label} className="controlContextRow">
              <div className="controlContextCopy">
                <p className="controlContextLabel">{row.label}</p>
                {row.description ? <p className="controlContextDescription">{row.description}</p> : null}
              </div>
              <p className="controlContextValue">{row.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuickActionsCard({ actions }: { actions: AdminOverviewAction[] }) {
  return (
    <section className="adminSection controlActionPanel panel">
      <div className="controlPanelHeader">
        <p className="controlPanelEyebrow">Операции</p>
        <h2 className="controlPanelTitle">Быстрые действия</h2>
        <p className="controlPanelDescription">
          Переходы в разделы, которые чаще всего нужны для ручной проверки, поддержки и выгрузки.
        </p>
      </div>
      <div className="controlActionList">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link key={action.href} href={action.href} className="controlAction">
              <span className="controlActionIcon">
                <Icon className="iconSm" />
              </span>
              <span className="controlActionCopy">
                <span className="controlActionLabel">{action.label}</span>
                <span className="controlActionDescription">{action.description}</span>
              </span>
              <ArrowRight className="controlActionArrow" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function DetailSection({ section }: { section: AdminOverviewSection }) {
  return (
    <section className="adminSection controlDetailPanel panel">
      <div className="controlPanelHeader">
        <p className="controlPanelEyebrow">Раздел</p>
        <h2 className="controlPanelTitle">{section.title}</h2>
        <p className="controlPanelDescription">{section.description}</p>
      </div>
      <div className="controlDetailList">
        {section.items.map((item) => (
          <MetricTile key={item.label} item={item} compact />
        ))}
      </div>
    </section>
  );
}

export function AdminProviderStatusSection({ statuses }: { statuses: ProviderStatusRow[] }) {
  return (
    <section className="adminSection adminProviderStatusSection">
      <div className="adminSection providerStatusPanel panel">
        <div className="controlPanelHeader">
          <p className="controlPanelEyebrow">Мониторинг</p>
          <h2 className="controlPanelTitle">Статусы модулей</h2>
          <p className="controlPanelDescription">
            Текущее состояние подключённых платёжных систем и сервисов.
          </p>
        </div>
        <div className="providerStatusList">
          {statuses.map((item) => (
            <article key={item.label} data-status={item.status} className="providerStatusRow">
              <div className="providerStatusCopy">
                <p className="providerStatusLabel">{item.label}</p>
                <p className="providerStatusDetail">{item.detail}</p>
              </div>
              <span
                className={cn(
                  "providerStatusBadge",
                  item.status === "available" && "providerStatusAvailable",
                  item.status === "unavailable" && "providerStatusUnavailable",
                  item.status === "timeout" && "providerStatusTimeout",
                  item.status === "not_configured" && "providerStatusNotConfigured",
                  item.status === "disabled" && "providerStatusDisabled"
                )}
              >
                {item.summary}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AdminProviderStatusFallback() {
  return (
    <section className="adminSection adminProviderStatusSection">
      <div className="adminSection providerStatusPanel panel">
        <div className="controlPanelHeader">
          <p className="controlPanelEyebrow">Мониторинг</p>
          <h2 className="controlPanelTitle">Статусы модулей</h2>
          <p className="controlPanelDescription">
            Текущее состояние подключённых платёжных систем и сервисов.
          </p>
        </div>
        <div className="providerStatusList">
          {[0, 1, 2].map((index) => (
            <article key={index} className="providerStatusRow">
              <div className="providerStatusCopy">
                <Skeleton className="providerStatusSkeletonLine" />
                <Skeleton className="providerStatusSkeletonText" />
              </div>
              <Skeleton className="providerStatusSkeletonBadge" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ChartSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="adminSection revenuePanel panel">
      <div className="controlPanelHeader">
        <p className="controlPanelEyebrow">Тренд</p>
        <h2 className="controlPanelTitle">{title}</h2>
        <p className="controlPanelDescription">{description}</p>
      </div>
      <div className="controlPanelBody">{children}</div>
    </section>
  );
}

export function AdminOverviewBlocks({
  summaryTitle,
  summaryDescription,
  primaryMetrics,
  contextRows,
  sections,
  providerStatusSlot,
  quickActions,
  chart,
  chartTitle = "Доход за 30 дней",
  chartDescription = "Тренд вынесен ниже после KPI и действий, чтобы первый экран оставался операционным."
}: AdminOverviewBlocksProps) {
  return (
    <div className="adminWorkspace adminOverviewBlocks">
      <div className="adminHero controlCenterHero">
        <SummaryCard
          title={summaryTitle}
          description={summaryDescription}
          metrics={primaryMetrics}
          rows={contextRows}
        />
        <QuickActionsCard actions={quickActions} />
      </div>

      <div className="adminOverviewTwoColumnGrid">
        {sections.map((section) => (
          <DetailSection key={section.title} section={section} />
        ))}
        {providerStatusSlot}
      </div>

      {chart ? (
        <ChartSection title={chartTitle} description={chartDescription}>
          {chart}
        </ChartSection>
      ) : null}
    </div>
  );
}
