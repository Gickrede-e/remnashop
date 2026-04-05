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
    <section className="mx-auto w-full max-w-lg">
      <div className="page-surface space-y-6 p-5 sm:p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">
              {publicEnv.NEXT_PUBLIC_SITE_NAME}
            </p>
            <span className="rounded-full border border-white/8 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-zinc-400">
              Auth
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">{title}</h1>
            <p className="text-sm leading-6 text-[var(--app-muted)]">{description}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href={loginHref}
            aria-current={activeView === "login" ? "page" : undefined}
            className={cn(
              "inline-flex h-11 items-center justify-center rounded-2xl border text-sm font-medium transition",
              activeView === "login"
                ? "border-sky-400/30 bg-sky-400/12 text-white"
                : "border-white/8 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.05]"
            )}
          >
            Войти
          </Link>
          <Link
            href={registerHref}
            aria-current={activeView === "register" ? "page" : undefined}
            className={cn(
              "inline-flex h-11 items-center justify-center rounded-2xl border text-sm font-medium transition",
              activeView === "register"
                ? "border-sky-400/30 bg-sky-400/12 text-white"
                : "border-white/8 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.05]"
            )}
          >
            Регистрация
          </Link>
        </div>

        {children ? <div className="border-t border-white/8 pt-6">{children}</div> : null}
      </div>
    </section>
  );
}
