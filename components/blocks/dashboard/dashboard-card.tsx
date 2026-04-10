import type { ReactNode } from "react";

type DashboardCardProps = {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function DashboardCard({ title, actions, children, className }: DashboardCardProps) {
  return (
    <section className={className ? `dashCard ${className}` : "dashCard"}>
      <header className="dashCardHead">
        <h2 className="dashCardTitle">{title}</h2>
        {actions ? <div className="dashCardActions">{actions}</div> : null}
      </header>
      <div className="dashCardBody">{children}</div>
    </section>
  );
}
