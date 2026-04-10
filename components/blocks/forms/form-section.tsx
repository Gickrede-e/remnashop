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
    <section className="formSection">
      <div className="formSectionHeader">
        <h2 className="formSectionTitle">{title}</h2>
        {description ? <p className="formSectionDescription">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
