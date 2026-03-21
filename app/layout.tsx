import type { Metadata, Viewport } from "next";

import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";
import { getSession } from "@/lib/auth/session";

import "./globals.css";

export const metadata: Metadata = {
  title: "GickVPN",
  description: "Магазин VPN-подписок GickVPN с личным кабинетом, оплатой и админкой."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="ru" className="dark" data-scroll-behavior="smooth">
      <body className="min-h-screen font-sans">
        <Providers>
          <div className="relative min-h-screen">
            <div
              className="pointer-events-none absolute inset-0 grid-strokes opacity-30"
              style={{ zIndex: -1 }}
            />
            <SiteHeader session={session} />
            <main>{children}</main>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
