import * as React from "react";

import { cn } from "@/lib/utils";

type ScreenHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  compact?: boolean;
  className?: string;
  titleClassName?: string;
  titleAs?: React.ElementType;
};

export function ScreenHeader({
  eyebrow,
  title,
  description,
  actions,
  compact = false,
  className,
  titleClassName,
  titleAs: Title = "h1"
}: ScreenHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", compact ? "flex-col" : "flex-col sm:flex-row", className)}>
      <div className="min-w-0 space-y-2">
        {eyebrow ? (
          <p className={cn(compact ? "text-[11px] tracking-[0.22em]" : "section-kicker", "uppercase text-zinc-400")}>
            {eyebrow}
          </p>
        ) : null}
        <div className="min-w-0 space-y-1">
          <Title
            className={cn(
              compact ? "truncate text-lg font-semibold text-white sm:text-xl" : "text-2xl font-semibold text-white sm:text-3xl",
              titleClassName
            )}
          >
            {title}
          </Title>
          {description ? (
            <p className={cn(compact ? "text-sm leading-5 text-zinc-400" : "max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base")}>
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
