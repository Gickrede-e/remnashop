import Link from "next/link";

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
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-black/30 backdrop-blur-xl">
      <div className="container flex h-20 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-zinc-400 hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {session ? (
            <>
              <Link href={session.role === "ADMIN" ? "/admin" : "/dashboard"}>
                <Button size="sm">
                  {session.role === "ADMIN" ? "Админка" : "Личный кабинет"}
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
      </div>
    </header>
  );
}
