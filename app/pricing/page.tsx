import { AppShell } from "@/components/shell/app-shell";

export default function PricingPage() {
  return (
    <AppShell area="public">
      <article className="panel">
        <div className="panelHeader">
          <p className="section-kicker">Тарифы</p>
          <h1 className="panelTitle">Тарифы</h1>
          <p className="panelDescription">Публичная памятка по сценариям покупки до входа в кабинет.</p>
        </div>
        <div className="panelBody screenHeaderText">
          <h2 className="panelTitle">Базовый сценарий</h2>
          <p>Подходит для быстрого старта: регистрация, оплата и получение конфигурации в одном потоке.</p>
          <h2 className="panelTitle">Продление действующего доступа</h2>
          <p>После входа вы увидите текущий тариф, срок окончания и кнопки продления без повторной настройки.</p>
          <h2 className="panelTitle">Покупка для команды или семьи</h2>
          <p>Отдельные устройства и дополнительные операции управляются уже из кабинета после авторизации.</p>
        </div>
      </article>
    </AppShell>
  );
}
