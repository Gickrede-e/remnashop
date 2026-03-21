import { redirect } from "next/navigation";

import { AuthEntryPanel } from "@/components/blocks/auth/auth-entry-panel";
import { getSession } from "@/lib/auth/session";

export default async function HomePage() {
  const session = await getSession();

  if (session) {
    redirect(session.role === "ADMIN" ? "/admin" : "/dashboard");
  }

  return (
    <div className="container flex min-h-dvh items-center justify-center px-4 py-8 sm:py-10">
      <AuthEntryPanel
        title="Вход и регистрация"
        description="Откройте кабинет или создайте аккаунт без маркетинговых экранов."
      >
        <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-zinc-300">
          Если у вас уже есть активная сессия, главная сразу отправит вас в нужный кабинет.
        </div>
      </AuthEntryPanel>
    </div>
  );
}
