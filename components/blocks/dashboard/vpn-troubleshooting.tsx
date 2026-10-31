"use client";

// The "connection not working?" guide. The reader picks their phone first, so the list holds
// only that platform's steps; the Happ reset path in the last step differs between the two.

import { ChevronRight } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

type Platform = "android" | "iphone";

type HelpStepContent = { title: string; body: ReactNode };

const PLATFORM_OPTIONS: Array<{ value: Platform; label: string }> = [
  { value: "android", label: "Android" },
  { value: "iphone", label: "iPhone" }
];

const FIRST_STEPS: HelpStepContent[] = [
  {
    title: "Переподключитесь в приложении",
    body: "Нажмите кнопку обновления / переподключения прямо в приложении. Настройки серверов иногда обновляются — нужно получить актуальный список."
  },
  {
    title: "Перезагрузите телефон",
    body: "Самое простое и часто самое действенное: перезагрузка сбрасывает сетевые соединения и убирает временные сбои."
  },
  {
    title: "Проверьте тип сети",
    body: "Убедитесь, что телефон подключён к 4G. На слабом сигнале и в сети 3G многие протоколы работают нестабильно или не подключаются вовсе."
  },
  {
    title: "Есть ли интернет без подключения",
    body: "Отключите подключение и откройте ВКонтакте или Яндекс. Если сайты открываются — интернет есть, и проблема именно в подключении."
  }
];

const PLATFORM_STEPS: Record<Platform, { label: string; steps: HelpStepContent[] }> = {
  android: {
    label: "на Android",
    steps: [
      {
        title: "Отключите частный DNS",
        body: (
          <>
            <p>Одна из самых частых причин, почему подключение на Android не работает или нестабильно.</p>
            <p>
              Настройки → Подключения и общий доступ (или Сеть и интернет) → Частный DNS-сервер →{" "}
              <strong>Выключено</strong>. Сохраните, перезагрузите телефон и подключитесь снова.
            </p>
            <p className="helpStepNote">На Xiaomi, Samsung, Realme и Honor название раздела может немного отличаться.</p>
          </>
        )
      }
    ]
  },
  iphone: {
    label: "на iPhone",
    steps: [
      {
        title: "Подключение само отключается",
        body: (
          <>
            <p>Если подключение работает, но через какое-то время отключается — Happ выгружается из памяти. Лечится так:</p>
            <p>
              В Happ откройте <strong>Настройки</strong> (слева сверху) → <strong>Dev Setting</strong> → уменьшите
              значение <strong>Xray memory limit</strong>. Значение у каждого устройства своё — подберите такое, при
              котором приложение перестанет выключаться.
            </p>
            <p>
              После этого Happ не будет выгружаться, а подключение — отключаться.{" "}
              <a href="https://telegra.ph/Happ-na-ios-postoyanno-vygruzhaetsya-06-15" target="_blank" rel="noreferrer">
                инструкция со скриншотами →
              </a>
            </p>
          </>
        )
      },
      {
        title: "Удалите старые профили",
        body: "Настройки → Основные → раздел управления профилями → удалите старые профили. Затем откройте Happ, разрешите добавить новый профиль, перезагрузите iPhone и подключитесь снова."
      },
      {
        title: "Включайте из центра уведомлений",
        body: "Если проблема осталась — попробуйте включать подключение через центр уведомлений, а не из приложения."
      }
    ]
  }
};

const RESET_STEPS: Record<Platform, HelpStepContent> = {
  android: {
    title: "Сбросьте настройки Happ",
    body: (
      <>
        <p>
          В Happ откройте <strong>Настройки → Сброс → Сбросить настройки</strong> и подключитесь снова.
        </p>
        <p className="helpStepNote">Если Happ на английском: Settings → Reset → Reset settings.</p>
      </>
    )
  },
  iphone: {
    title: "Сбросьте настройки Happ",
    body: (
      <>
        <p>
          В Happ откройте <strong>Настройки → Сброс → Сбросить пользовательские настройки</strong> и подключитесь
          снова.
        </p>
        <p className="helpStepNote">Если Happ на английском: Settings → Reset → Reset user settings.</p>
      </>
    )
  }
};

function getHelpGroups(platform: Platform) {
  const groups = [
    { label: "сначала", steps: FIRST_STEPS },
    PLATFORM_STEPS[platform],
    { label: "всё ещё не работает", steps: [RESET_STEPS[platform]] }
  ];

  // Steps are numbered straight through the groups, so each group starts after the last.
  let stepsBefore = 0;
  return groups.map((group) => {
    const firstNumber = stepsBefore + 1;
    stepsBefore += group.steps.length;
    return { ...group, firstNumber };
  });
}

function HelpStep({ n, title, isOpen, children }: { n: number; title: string; isOpen: boolean; children: ReactNode }) {
  return (
    <details className="helpStep" open={isOpen}>
      <summary className="helpStepSummary">
        <span className="helpStepNum" aria-hidden="true">
          {String(n).padStart(2, "0")}
        </span>
        <span className="helpStepTitle">{title}</span>
        <ChevronRight className="helpStepChevron" width={14} height={14} aria-hidden="true" />
      </summary>
      <div className="helpStepBody">{children}</div>
    </details>
  );
}

export function VpnTroubleshooting() {
  const [platform, setPlatform] = useState<Platform>("android");
  const platformLabelId = useId();

  return (
    <section className="dashCard helpTroubleshootingCard">
      <div className="dashCardHead">
        <h2 className="dashCardTitle">Не работает подключение?</h2>
      </div>
      <p className="helpIntro">Без паники — чаще всего это лечится за пару минут. Идите по шагам сверху вниз.</p>
      <div className="helpPlatform">
        <span id={platformLabelId} className="helpPlatformLabel">
          Ваш телефон
        </span>
        <div className="helpPlatformSwitch" role="group" aria-labelledby={platformLabelId}>
          {PLATFORM_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className="helpPlatformOption"
              aria-pressed={platform === option.value}
              onClick={() => setPlatform(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="helpGroups">
        {getHelpGroups(platform).map((group) => (
          <div key={group.label} className="helpGroup">
            <p className="helpGroupLabel">{group.label}</p>
            {group.steps.map((step, index) => (
              <HelpStep
                key={step.title}
                n={group.firstNumber + index}
                title={step.title}
                isOpen={group.firstNumber + index === 1}
              >
                {step.body}
              </HelpStep>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
