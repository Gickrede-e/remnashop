import type { Metadata, Viewport } from "next";

import { Providers } from "@/components/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "GickShop",
  description: "Магазин VPN-подписок GickShop с личным кабинетом, оплатой и админкой."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="dark">
      <body className="min-h-dvh bg-[var(--app-bg)] text-[var(--app-fg)] antialiased">
        <Providers>
          <div className="app-shell">
            <main>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
