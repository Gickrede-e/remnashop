import { redirect } from "next/navigation";

import { AppShell } from "@/components/shell/app-shell";
import { getSession } from "@/lib/auth/session";

export default async function HomePage() {
  const session = await getSession();

  if (session) {
    redirect(session.role === "ADMIN" ? "/admin" : "/dashboard");
  }

  return (
    <AppShell area="public">
      <section className="panel publicEntry">
        <div className="panelHeader">
          <p className="section-kicker">RemnaShop access</p>
          <h1 className="panelTitle">Вход без лишнего шума.</h1>
          <p className="panelDescription">Короткая гостевая страница перед кабинетом, тарифами и условиями доступа.</p>
        </div>
        <div className="panelBody screenHeaderText">
          <p>Слева остаются только базовые маршруты: тарифы, FAQ и условия использования.</p>
          <p>Если сессия уже активна, главная по-прежнему сразу переводит вас в кабинет или админку.</p>
        </div>
      </section>
    </AppShell>
  );
}
