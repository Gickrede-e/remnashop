import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { publicEnv } from "@/lib/public-env";

type Crumb = { label: string; href?: string };

type DashboardPageHeaderProps = {
  title: string;
  crumbs: Crumb[];
  action?: ReactNode;
  /** Доп. элемент перед основным action (напр. алерт «Истекает через N дней»). */
  alert?: ReactNode;
};

export function DashboardPageHeader({ title, crumbs, action, alert }: DashboardPageHeaderProps) {
  const supportUrl = publicEnv.NEXT_PUBLIC_SUPPORT_TELEGRAM_URL.trim();
  const resolvedAction =
    action ??
    (supportUrl ? (
      <Link
        href={supportUrl}
        target="_blank"
        rel="noreferrer"
        className="dashSidebarCta dashSupportCta"
      >
        Поддержка
      </Link>
    ) : null);
  const hasHeaderAction = Boolean(alert || resolvedAction);

  return (
    <header className="dashPageHeader">
      <div className="dashPageHeaderText">
        <h1 className="dashPageTitle">{title}</h1>
        <ol className="dashBreadcrumb">
          {crumbs.map((crumb, index) => (
            <li key={`${crumb.label}-${index}`} className="dashBreadcrumbItem">
              {crumb.href ? (
                <Link href={crumb.href} className="dashBreadcrumbLink">
                  {crumb.label}
                </Link>
              ) : (
                <span className="dashBreadcrumbCurrent" aria-current="page">
                  {crumb.label}
                </span>
              )}
              {index < crumbs.length - 1 ? (
                <ChevronRight className="dashBreadcrumbSep" aria-hidden="true" />
              ) : null}
            </li>
          ))}
        </ol>
      </div>
      {hasHeaderAction ? (
        <div className="dashPageHeaderAction">
          {alert}
          {resolvedAction}
        </div>
      ) : null}
    </header>
  );
}
