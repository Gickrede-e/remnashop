import Link from "next/link";
import type { ReactNode } from "react";

import { buildLoginHref, buildRegisterHref } from "@/lib/auth/navigation";
import { publicEnv } from "@/lib/public-env";
import { cn } from "@/lib/utils";

type AuthEntryPanelProps = {
  title: string;
  description: string;
  activeView?: "login" | "register";
  nextPath?: string;
  referralCode?: string;
  children?: ReactNode;
};

export function AuthEntryPanel({
  title,
  description,
  activeView,
  nextPath,
  referralCode,
  children
}: AuthEntryPanelProps) {
  const loginHref = buildLoginHref(nextPath);
  const registerHref = buildRegisterHref(nextPath, referralCode);

  return (
    <section className="authCard authEntry authScenePanel panel">
      <div className="authCardHeader authEntryHeader">
        <p className="authCardEyebrow authEntryEyebrow">{publicEnv.NEXT_PUBLIC_SITE_NAME}</p>
        <div className="authCardHeading">
          <h1 className="authCardTitle authEntryTitle">{title}</h1>
          <p className="authCardDescription authEntryDescription">{description}</p>
        </div>
      </div>

      <nav className="authCardTabs authEntryTabs" aria-label="Навигация авторизации">
        <Link
          href={loginHref}
          aria-current={activeView === "login" ? "page" : undefined}
          className={cn("authCardTab authEntryTab", activeView === "login" && "authCardTabCurrent authEntryTabCurrent")}
        >
          Войти
        </Link>
        <Link
          href={registerHref}
          aria-current={activeView === "register" ? "page" : undefined}
          className={cn("authCardTab authEntryTab", activeView === "register" && "authCardTabCurrent authEntryTabCurrent")}
        >
          Регистрация
        </Link>
      </nav>

      {children ? <div className="authCardBody authEntryBody">{children}</div> : null}
    </section>
  );
}
