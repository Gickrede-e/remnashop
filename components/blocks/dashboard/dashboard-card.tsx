import type { ReactNode } from "react";

type DashboardCardProps = {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function DashboardCard({ title, actions, children, className }: DashboardCardProps) {
  return (
    <section className={className ? `dashCard ${className}` : "dashCard"}>
      {title || actions ? (
        <header className="dashCardHead">
          {title ? <h2 className="dashCardTitle">{title}</h2> : <span aria-hidden="true" />}
          {actions ? <div className="dashCardActions">{actions}</div> : null}
        </header>
      ) : null}
      <div className="dashCardBody">{children}</div>
    </section>
  );
}
