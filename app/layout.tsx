import type { Metadata, Viewport } from "next";
import Link from "next/link";

import { Providers } from "@/components/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "GickVPN",
  description: "Магазин VPN-подписок GickVPN с личным кабинетом, оплатой и админкой."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-dvh bg-[var(--app-bg)] text-[var(--app-fg)] antialiased">
        <Providers>
          <div className="app-shell flex flex-col">
            <div className="border-b border-[var(--app-border)] bg-[var(--app-surface)]/96">
              <div className="mx-auto flex min-h-14 w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
                <Link href="/" className="text-sm font-semibold tracking-[0.18em] text-[var(--app-fg)] uppercase">
                  GickVPN
                </Link>
                <span className="text-xs text-[var(--app-muted)]">Личный кабинет и управление подпиской</span>
              </div>
            </div>

            <main className="flex-1">{children}</main>

            <div className="border-t border-[var(--app-border)] bg-[var(--app-surface)]/92">
              <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 text-xs text-[var(--app-muted)] sm:px-6">
                <span>GickVPN</span>
                <span>Управление VPN-подписками</span>
              </div>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
