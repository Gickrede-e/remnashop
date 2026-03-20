import Link from "next/link";
import { Menu } from "lucide-react";

import type { SessionPayload } from "@/lib/auth/session";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/shared/logout-button";

const links = [
  { href: "/pricing", label: "Тарифы" },
  { href: "/setup", label: "Настройка" },
  { href: "/faq", label: "FAQ" }
];

export function SiteHeader({ session }: { session: SessionPayload | null }) {
  const dashboardHref = session?.role === "ADMIN" ? "/admin" : "/dashboard";
  const dashboardLabel = session?.role === "ADMIN" ? "Админка" : "Личный кабинет";

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-black/30 backdrop-blur-xl">
      <div className="container flex h-20 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-10 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex min-h-11 items-center text-sm text-zinc-400 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {session ? (
            <>
              <Link href={dashboardHref}>
                <Button size="sm">
                  {dashboardLabel}
                </Button>
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Вход
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Регистрация</Button>
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          {session ? (
            <Link href={dashboardHref}>
              <Button size="sm">{dashboardLabel}</Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Вход
              </Button>
            </Link>
          )}

          <details className="group relative">
            <summary className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/[0.06]">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Открыть меню</span>
            </summary>

            <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(88vw,320px)] rounded-[24px] border border-white/10 bg-black/95 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
              <nav className="grid gap-1">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex min-h-11 items-center rounded-2xl px-4 text-sm text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-3 grid gap-2 border-t border-white/10 pt-3">
                {session ? (
                  <>
                    <Link href={dashboardHref}>
                      <Button className="w-full" size="sm">
                        {dashboardLabel}
                      </Button>
                    </Link>
                    <div className="w-full [&>button]:w-full">
                      <LogoutButton />
                    </div>
                  </>
                ) : (
                  <>
                    <Link href="/login">
                      <Button className="w-full" size="sm" variant="secondary">
                        Вход
                      </Button>
                    </Link>
                    <Link href="/register">
                      <Button className="w-full" size="sm">Регистрация</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
