import type { ReactNode } from "react";

import { publicEnv } from "@/lib/public-env";

type AuthStandaloneCardProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function AuthStandaloneCard({ title, description, children }: AuthStandaloneCardProps) {
  return (
    <section className="authCard authStandaloneCard authScenePanel panel">
      <div className="authCardHeader authStandaloneHeader">
        <p className="authCardEyebrow authStandaloneBrand">{publicEnv.NEXT_PUBLIC_SITE_NAME}</p>
        <div className="authCardHeading">
          <h1 className="authCardTitle authStandaloneTitle">{title}</h1>
          <p className="authCardDescription authStandaloneDescription">{description}</p>
        </div>
      </div>
      <div className="authCardBody authStandaloneBody">{children}</div>
    </section>
  );
}
