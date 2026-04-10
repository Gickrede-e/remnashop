import type { ReactNode } from "react";

import { publicEnv } from "@/lib/public-env";

type AuthStandaloneCardProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function AuthStandaloneCard({ title, description, children }: AuthStandaloneCardProps) {
  return (
    <section className="authCard authStandaloneCard">
      <div className="authStandaloneHeader">
        <p className="authStandaloneBrand">{publicEnv.NEXT_PUBLIC_SITE_NAME}</p>
        <h1 className="authStandaloneTitle">{title}</h1>
        <p className="authStandaloneDescription">{description}</p>
      </div>
      <div className="authCardBody authStandaloneBody">{children}</div>
    </section>
  );
}
