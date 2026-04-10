import { AppShell } from "@/components/shell/app-shell";

export default function TermsPage() {
  return (
    <AppShell area="public">
      <article className="panel">
        <div className="panelHeader">
          <p className="section-kicker">Условия</p>
          <h1 className="panelTitle">Условия</h1>
          <p className="panelDescription">Короткая версия правил использования до перехода в авторизованный контур.</p>
        </div>
        <div className="panelBody screenHeaderText">
          <h2 className="panelTitle">Доступ выдаётся на аккаунт</h2>
          <p>Покупка закрепляется за профилем, поэтому дальнейшее управление подпиской и устройствами идёт из кабинета.</p>
          <h2 className="panelTitle">Платёж подтверждает продление периода</h2>
          <p>После успешной оплаты срок доступа и связанный тариф обновляются в вашем профиле.</p>
          <h2 className="panelTitle">Поддержка рассматривает спорные кейсы вручную</h2>
          <p>Если данные доступа или статус подписки расходятся с ожидаемым результатом, используйте авторизованный контур для проверки и эскалации.</p>
        </div>
      </article>
    </AppShell>
  );
}
