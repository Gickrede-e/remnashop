import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className={cn("rounded-[22px] border border-white/10 bg-white/[0.03]", compact ? "p-4" : "p-4 sm:p-5")}>
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{item.label}</p>
      <p className={cn("mt-3 break-words font-semibold text-white", compact ? "text-xl" : "text-2xl sm:text-[1.75rem]")}>
        {item.value}
      </p>
      {item.hint ? <p className="mt-2 text-sm leading-5 text-zinc-400">{item.hint}</p> : null}
    </div>
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
    <Card>
      <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-5">
        <CardTitle className="text-lg text-white sm:text-xl">{title}</CardTitle>
        <CardDescription className="text-sm leading-6 text-zinc-400">{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 p-5 pt-0 sm:p-6 sm:pt-0">
        <div className="grid gap-3 sm:grid-cols-2">
          {metrics.map((item) => (
            <MetricTile key={item.label} item={item} />
          ))}
        </div>
        <div className="grid gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-4 border-b border-white/8 pb-3 last:border-b-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-sm text-zinc-300">{row.label}</p>
                {row.description ? <p className="mt-1 text-xs leading-5 text-zinc-500">{row.description}</p> : null}
              </div>
              <p className="shrink-0 text-right text-sm font-semibold text-white">{row.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionsCard({ actions }: { actions: AdminOverviewAction[] }) {
  return (
    <Card>
      <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-5">
        <CardTitle className="text-lg text-white sm:text-xl">Быстрые действия</CardTitle>
        <CardDescription className="text-sm leading-6 text-zinc-400">
          Переходы в разделы, которые чаще всего нужны для ручной проверки, поддержки и выгрузки.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 p-5 pt-0 sm:p-6 sm:pt-0">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.href}
              href={action.href}
              className="group flex items-start gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 transition hover:border-white/20 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-zinc-200">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-white">{action.label}</span>
                <span className="mt-1 block text-sm leading-5 text-zinc-400">{action.description}</span>
              </span>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-zinc-500 transition group-hover:text-zinc-200" />
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

function DetailSection({ section }: { section: AdminOverviewSection }) {
  return (
    <Card>
      <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-5">
        <CardTitle className="text-lg text-white sm:text-xl">{section.title}</CardTitle>
        <CardDescription className="text-sm leading-6 text-zinc-400">{section.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 p-5 pt-0 sm:p-6 sm:pt-0">
        {section.items.map((item) => (
          <MetricTile key={item.label} item={item} compact />
        ))}
      </CardContent>
    </Card>
  );
}

export function AdminProviderStatusSection({ statuses }: { statuses: ProviderStatusRow[] }) {
  return (
    <Card>
      <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-5">
        <CardTitle className="text-lg text-white sm:text-xl">Статусы модулей</CardTitle>
        <CardDescription className="text-sm leading-6 text-zinc-400">
          Быстрая серверная проверка интеграций без перехода в отдельные журналы и ручные refresh-действия.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 p-5 pt-0 sm:p-6 sm:pt-0">
        {statuses.map((item) => (
          <div
            key={item.label}
            data-status={item.status}
            className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">{item.detail}</p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                  item.status === "available" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
                  item.status === "unavailable" && "border-rose-500/30 bg-rose-500/10 text-rose-200",
                  item.status === "timeout" && "border-amber-500/30 bg-amber-500/10 text-amber-100",
                  item.status === "not_configured" && "border-zinc-500/30 bg-zinc-500/10 text-zinc-200"
                )}
              >
                {item.summary}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function AdminProviderStatusFallback() {
  return (
    <Card>
      <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-5">
        <CardTitle className="text-lg text-white sm:text-xl">Статусы модулей</CardTitle>
        <CardDescription className="text-sm leading-6 text-zinc-400">
          Быстрая серверная проверка интеграций без перехода в отдельные журналы и ручные refresh-действия.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 p-5 pt-0 sm:p-6 sm:pt-0">
        {[0, 1, 2].map((index) => (
          <div key={index} className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-24 bg-white/10" />
                <Skeleton className="mt-2 h-3 w-32 bg-white/10" />
              </div>
              <Skeleton className="h-7 w-20 rounded-full bg-white/10" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ChartSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-5">
        <CardTitle className="text-lg text-white sm:text-xl">{title}</CardTitle>
        <CardDescription className="text-sm leading-6 text-zinc-400">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">{children}</CardContent>
    </Card>
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
    <div className="grid gap-4 sm:gap-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]">
        <SummaryCard title={summaryTitle} description={summaryDescription} metrics={primaryMetrics} rows={contextRows} />
        <QuickActionsCard actions={quickActions} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map((section) => (
          <DetailSection key={section.title} section={section} />
        ))}
        {providerStatusSlot}
      </div>

      {chart ? <ChartSection title={chartTitle} description={chartDescription}>{chart}</ChartSection> : null}
    </div>
  );
}
