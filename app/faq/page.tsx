import { AppShell } from "@/components/shell/app-shell";

export default function FaqPage() {
  return (
    <AppShell area="public">
      <article className="panel">
        <div className="panelHeader">
          <p className="section-kicker">FAQ</p>
          <h1 className="panelTitle">FAQ</h1>
          <p className="panelDescription">Короткие ответы на вопросы о доступе, оплате и запуске подписки.</p>
        </div>
        <div className="panelBody screenHeaderText">
          <h2 className="panelTitle">Как быстро стартовать?</h2>
          <p>Создайте аккаунт, выберите тариф и сразу откройте реквизиты доступа в личном кабинете.</p>
          <h2 className="panelTitle">Что делать, если доступ уже был?</h2>
          <p>Войдите под прежним email: активная сессия и история платежей останутся в кабинете.</p>
          <h2 className="panelTitle">Куда писать по спорным вопросам?</h2>
          <p>Для продлений, устройства и статуса подписки используйте форму входа и дальнейшие инструменты кабинета.</p>
        </div>
      </article>
    </AppShell>
  );
}
