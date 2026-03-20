import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/5 py-10">
      <div className="container flex flex-col gap-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-medium text-foreground">GickVPN</p>
          <p>Платные VPN-подписки с личным кабинетом, рефералкой и админским контролем.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/pricing" className="transition hover:text-foreground">
            Тарифы
          </Link>
          <Link href="/faq" className="transition hover:text-foreground">
            FAQ
          </Link>
        </div>
      </div>
    </footer>
  );
}
