import type { ReactNode } from "react";

export function FormSection({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <div className="mb-4 space-y-1">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {description ? <p className="text-sm leading-6 text-zinc-400">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
