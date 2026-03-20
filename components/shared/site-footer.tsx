import Link from "next/link";

import { Logo } from "@/components/shared/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/5 py-8 sm:py-10">
      <div className="container">
        <div className="surface-soft flex flex-col gap-6 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
          <Logo />
            <p className="max-w-lg text-sm leading-6 text-zinc-400">
              GickVPN шифрует ваш трафик и скрывает IP-адрес. Ваши данные остаются только вашими.
            </p>
          </div>
          <div className="flex flex-wrap gap-5 text-sm text-zinc-400">
            <Link href="/pricing" className="inline-flex min-h-11 items-center hover:text-white">
              Тарифы
            </Link>
            <Link href="/setup" className="inline-flex min-h-11 items-center hover:text-white">
              Настройка
            </Link>
            <Link href="/faq" className="inline-flex min-h-11 items-center hover:text-white">
              FAQ
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
