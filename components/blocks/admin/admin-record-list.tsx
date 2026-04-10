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
    <Card className="recordWorkspace adminRecordList">
      <CardHeader className="adminRecordListHeader">
        <div className="adminRecordListHeading">
          <div className="adminRecordListCopy">
            <CardTitle className="adminRecordListTitle">{title}</CardTitle>
            {description ? (
              <CardDescription className="adminRecordListDescription">{description}</CardDescription>
            ) : null}
          </div>
          {controls ? <div className="adminRecordListControls">{controls}</div> : null}
        </div>
        {summary ? <div className="adminRecordListSummary">{summary}</div> : null}
      </CardHeader>
      <CardContent className="adminRecordListBody">{children}</CardContent>
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
    <article className="adminSection adminRecordCard">
      <div className="adminRecordCardLayout">
        <div className="adminRecordCardContent">
          <div className="adminRecordCardHeader">
            <div className="adminRecordCardCopy">
              <p className="adminRecordCardTitle">{title}</p>
              {subtitle ? <p className="adminRecordCardSubtitle">{subtitle}</p> : null}
            </div>
            {badge ? <div className="adminRecordCardBadge">{badge}</div> : null}
          </div>

          <dl className="adminRecordMetadata">
            {metadata.map((item) => (
              <div key={item.label} className="adminRecordMetadataRow">
                <dt className="adminRecordMetadataLabel">{item.label}</dt>
                <dd className="adminRecordMetadataValue">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {actions ? <div className="adminRecordCardActions">{actions}</div> : null}
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
    <div className="adminEmptyState">
      <p className="adminEmptyStateTitle">{title}</p>
      <p className="adminEmptyStateDescription">{description}</p>
    </div>
  );
}
