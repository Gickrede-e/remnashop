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
    <div className={cn("screenHeader", compact && "screenHeaderCompact", className)}>
      <div className="screenHeaderCopy">
        {eyebrow ? (
          <p className={cn("screenHeaderEyebrow", compact && "screenHeaderEyebrowCompact")}>{eyebrow}</p>
        ) : null}
        <div className="screenHeaderText">
          <Title className={cn("screenHeaderTitle", compact && "screenHeaderTitleCompact", titleClassName)}>
            {title}
          </Title>
          {description ? <p className={cn("screenHeaderDescription", compact && "screenHeaderDescriptionCompact")}>{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="screenHeaderActions">{actions}</div> : null}
    </div>
  );
}
