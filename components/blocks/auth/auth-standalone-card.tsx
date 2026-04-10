import type { ReactNode } from "react";

import { publicEnv } from "@/lib/public-env";

export type AuthStandaloneCardProps = {
  title: string;
  children: ReactNode;
};

export function AuthStandaloneCard({ title, children }: AuthStandaloneCardProps) {
  return (
    <section className="authCard authStandaloneCard">
      <header className="authStandaloneHeader">
        <p className="authStandaloneBrand">{publicEnv.NEXT_PUBLIC_SITE_NAME}</p>
        <h1 className="authStandaloneTitle">{title}</h1>
      </header>
      <div className="authStandaloneBody">{children}</div>
    </section>
  );
}
