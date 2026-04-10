import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";

import { Providers } from "@/components/providers";

import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap"
});

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
    <html lang="ru" className={`dark ${jetbrainsMono.variable}`}>
      <body className="appBody">
        <Providers>
          <div className="appRoot">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
