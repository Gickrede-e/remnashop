import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

type Crumb = { label: string; href?: string };

type DashboardPageHeaderProps = {
  title: string;
  crumbs: Crumb[];
  action?: ReactNode;
};

export function DashboardPageHeader({ title, crumbs, action }: DashboardPageHeaderProps) {
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
      {action ? <div className="dashPageHeaderAction">{action}</div> : null}
    </header>
  );
}
