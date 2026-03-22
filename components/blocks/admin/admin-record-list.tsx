import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminRecordList({
  title,
  description,
  controls,
  summary,
  children
}: {
  title: string;
  description?: string;
  controls?: ReactNode;
  summary?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <CardTitle className="text-lg text-white sm:text-xl">{title}</CardTitle>
            {description ? (
              <CardDescription className="max-w-2xl text-sm leading-6 text-zinc-400">{description}</CardDescription>
            ) : null}
          </div>
          {controls ? <div className="w-full xl:w-auto xl:min-w-[280px]">{controls}</div> : null}
        </div>
        {summary ? <div>{summary}</div> : null}
      </CardHeader>
      <CardContent className="grid gap-4 p-5 pt-0 sm:p-6 sm:pt-0">{children}</CardContent>
    </Card>
  );
}

export function AdminRecordCard({
  title,
  subtitle,
  badge,
  metadata,
  actions
}: {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  metadata: Array<{ label: string; value: string }>;
  actions?: ReactNode;
}) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-5">
        <div className="min-w-0 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="break-all text-sm font-medium text-white">{title}</p>
              {subtitle ? <p className="text-xs text-zinc-500">{subtitle}</p> : null}
            </div>
            {badge ? <div className="shrink-0">{badge}</div> : null}
          </div>

          <dl className="grid gap-2.5">
            {metadata.map((item) => (
              <div
                key={item.label}
                className="flex items-start justify-between gap-4 border-t border-white/6 pt-2.5 first:border-t-0 first:pt-0"
              >
                <dt className="shrink-0 text-xs uppercase tracking-[0.18em] text-zinc-500">{item.label}</dt>
                <dd className="min-w-0 break-words text-right text-sm text-white">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {actions ? <div className="sm:w-[320px] sm:max-w-full">{actions}</div> : null}
      </div>
    </article>
  );
}

export function AdminRecordEmptyState({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-zinc-300">
      <p className="font-medium text-white">{title}</p>
      <p className="mt-2 leading-6 text-zinc-400">{description}</p>
    </div>
  );
}
