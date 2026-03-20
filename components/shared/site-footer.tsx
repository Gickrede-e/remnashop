import Link from "next/link";

import { Logo } from "@/components/shared/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/5 py-10">
      <div className="container flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-md text-sm text-zinc-400">
            Надёжные VPN-подписки с автоматическим продлением, реферальной системой и удобным
            управлением доступом.
          </p>
        </div>
        <div className="flex flex-wrap gap-5 text-sm text-zinc-400">
          <Link href="/pricing" className="hover:text-white">
            Тарифы
          </Link>
          <Link href="/setup" className="hover:text-white">
            Настройка
          </Link>
          <Link href="/faq" className="hover:text-white">
            FAQ
          </Link>
        </div>
      </div>
    </footer>
  );
}
