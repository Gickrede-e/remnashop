import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { headers } from "next/headers";

import { Providers } from "@/components/providers";

import "./globals.css";
import "./styles/cabinet.css";

// Inter sets both body and headings: the design's Space Grotesk has no Cyrillic, and the UI is Russian.
// The optical-size axis gives large text (the day count, totals) Inter's tighter display shapes.
const inter = Inter({
  subsets: ["latin", "cyrillic"],
  axes: ["opsz"],
  variable: "--font-sans",
  display: "swap"
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap"
});

export const metadata: Metadata = {
  title: "GickShop",
  description: "Личный кабинет GickShop для управления подписками и оплатой.",
  robots: { index: false, follow: false }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read the per-request nonce middleware wrote into the request headers; Next.js
  // automatically threads it through to every <script> it injects when present.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="ru" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="appBody">
        <Providers nonce={nonce}>
          <div className="appRoot">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
