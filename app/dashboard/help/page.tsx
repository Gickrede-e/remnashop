import { Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/components/blocks/dashboard/dashboard-page-header";
import { VpnTroubleshooting } from "@/components/blocks/dashboard/vpn-troubleshooting";
import { getSession } from "@/lib/auth/session";
import { publicEnv } from "@/lib/public-env";

export const dynamic = "force-dynamic";

export default async function DashboardHelpPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const supportUrl = publicEnv.NEXT_PUBLIC_SUPPORT_TELEGRAM_URL.trim();

  return (
    <div className="dashShellPageWrapper">
      <DashboardPageHeader
        title="Помощь"
        crumbs={[{ label: "Кабинет", href: "/dashboard" }, { label: "Помощь" }]}
        alert={
          <Link href="/dashboard?tour=1" className="helpTourLink">
            <Sparkles className="iconSm iconNoShrink" aria-hidden="true" />
            Пройти обучение
          </Link>
        }
      />
      <div className="dashWorkspace">
        <VpnTroubleshooting />
        {supportUrl ? (
          <section className="dashCard helpSupportCard">
            <div className="helpSupportText">
              <h2 className="dashCardTitle">Всё ещё не работает?</h2>
              <p className="helpIntro">
                Напишите в поддержку в Telegram: укажите модель телефона и какие шаги уже попробовали.
              </p>
            </div>
            <Link href={supportUrl} target="_blank" rel="noreferrer" className="button buttonPrimary helpSupportAction">
              <Send className="iconSm iconNoShrink" aria-hidden="true" />
              Написать в поддержку
            </Link>
          </section>
        ) : null}
      </div>
    </div>
  );
}
