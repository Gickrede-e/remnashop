"use client";

// components/blocks/dashboard/cabinet-tour.tsx
//
// Интерактивное обучение по кабинету (перенос «$обучение» из дизайна
// GickShop Design System, templates/cabinet/Cabinet.dc.html). Подсвечивает
// три ключевых места на главной странице «Подписка» и ведёт пользователя
// подсказками. Запускается:
//   • по ссылке /dashboard?tour=1 (кнопка «Пройти обучение» на «Помощи»);
//   • автоматически при первом заходе в кабинет (флаг в localStorage).
//
// Монтируется только на /dashboard, где присутствуют все цели тура.

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

type TourStep = {
  sel: string;
  title: string;
  text: string;
};

type Rect = { top: number; left: number; w: number; h: number };

const STORAGE_KEY = "gs.cabinet.tourSeen";

const STEPS: TourStep[] = [
  {
    sel: '[data-tour="stats"]',
    title: "Информация о подписке",
    text: "Сколько дней осталось и до какого числа действует доступ — всегда здесь, на главном экране кабинета."
  },
  {
    // ссылка «Купить» в навигации (сайдбар на десктопе / нижняя панель на мобиле);
    // tourId приходит из модели навигации, чтобы не спутать с другими ссылками на /dashboard/buy.
    sel: '[data-tour="buy"]',
    title: "Купить и продлить",
    text: "Тарифы и оплата — в разделе «Купить». Разовый платёж: СБП или карта РФ, без авто-продлений."
  },
  {
    sel: '[data-tour="connect"]',
    title: "Подключение после оплаты",
    text: "Оплатили — нажмите «Подключить»: откроется страница с инструкцией по подключению."
  }
];

function pickTarget(sel: string): DOMRect | null {
  const nodes = Array.from(document.querySelectorAll(sel));
  let best: DOMRect | null = null;
  let bestArea = 0;
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    // берём самый крупный видимый элемент (мобильную/десктопную копию навигации)
    if (rect.width > 4 && rect.height > 4 && rect.width * rect.height > bestArea) {
      best = rect;
      bestArea = rect.width * rect.height;
    }
  }
  return best;
}

export function CabinetTour() {
  const [step, setStep] = useState(-1);
  const [rect, setRect] = useState<Rect | null>(null);
  const measureTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = step >= 0 && step < STEPS.length;

  const measure = useCallback((index: number) => {
    if (index < 0 || index >= STEPS.length) {
      return;
    }
    const target = pickTarget(STEPS[index].sel);
    if (!target) {
      setRect(null);
      return;
    }
    const pad = 10;
    setRect({
      top: target.top - pad,
      left: target.left - pad,
      w: target.width + pad * 2,
      h: target.height + pad * 2
    });
  }, []);

  const measureSoon = useCallback(
    (index: number, ms: number) => {
      if (measureTimer.current) {
        clearTimeout(measureTimer.current);
      }
      measureTimer.current = setTimeout(() => measure(index), ms);
    },
    [measure]
  );

  const markSeen = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* приватный режим — просто не запоминаем */
    }
  }, []);

  const stop = useCallback(() => {
    setStep(-1);
    setRect(null);
    markSeen();
  }, [markSeen]);

  const start = useCallback(() => {
    setStep(0);
    setRect(null);
    measureSoon(0, 80);
    markSeen();
    // Убираем ?tour=1 из адреса, чтобы обновление страницы не перезапускало тур.
    // Делаем это ЗДЕСЬ, а не при чтении параметра: в dev React StrictMode дважды
    // вызывает эффекты, и если чистить URL на первом (отбрасываемом) прогоне —
    // второй, настоящий, уже не увидит намерения и тур не стартует.
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has("tour")) {
        params.delete("tour");
        const query = params.toString();
        window.history.replaceState(null, "", window.location.pathname + (query ? `?${query}` : ""));
      }
    } catch {
      /* no-op */
    }
  }, [markSeen, measureSoon]);

  // Автозапуск: ?tour=1 (явно) либо первый заход (нет флага).
  useEffect(() => {
    let requested = false;
    try {
      requested = new URLSearchParams(window.location.search).get("tour") === "1";
    } catch {
      requested = false;
    }

    let seen = false;
    try {
      seen = window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      seen = false;
    }

    if (!requested && seen) {
      return;
    }

    const delay = requested ? 120 : 700;
    const timer = setTimeout(start, delay);
    return () => clearTimeout(timer);
  }, [start]);

  // Пересчёт позиции при ресайзе/скролле, закрытие по Escape.
  useEffect(() => {
    if (!active) {
      return;
    }
    const onReflow = () => measureSoon(step, 40);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        stop();
      }
    };
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [active, step, measureSoon, stop]);

  useEffect(() => {
    return () => {
      if (measureTimer.current) {
        clearTimeout(measureTimer.current);
      }
    };
  }, []);

  if (!active) {
    return null;
  }

  const isLast = step >= STEPS.length - 1;
  const current = STEPS[step];

  // Позиция подсказки: справа от цели, если влезает; иначе снизу/сверху; иначе по центру.
  // Только клиент: до первого эффекта step = -1 и компонент возвращает null выше.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tipW = Math.min(300, vw - 24);
  let tipLeft: number;
  let tipTop: number;
  if (rect) {
    if (rect.left + rect.w + tipW + 30 < vw && rect.w < 340) {
      tipLeft = rect.left + rect.w + 18;
      tipTop = Math.max(16, Math.min(rect.top, vh - 260));
    } else {
      tipLeft = Math.max(12, Math.min(rect.left, vw - tipW - 12));
      tipTop = rect.top + rect.h + 18;
      if (tipTop > vh - 250) {
        tipTop = Math.max(16, rect.top - 18 - 225);
      }
    }
  } else {
    tipLeft = Math.max(12, (vw - tipW) / 2);
    tipTop = Math.max(16, (vh - 220) / 2);
  }

  const dots = STEPS.map((_, index) => (index === step ? "●" : "○")).join("");

  return (
    <div className="tourOverlay" data-tour-overlay="true">
      {rect ? (
        <div className="tourSpot" style={{ top: rect.top, left: rect.left, width: rect.w, height: rect.h }}>
          <span className="tourSpotPulse" aria-hidden="true" />
        </div>
      ) : (
        <div className="tourBackdrop" />
      )}

      <div
        className="tourTip"
        role="dialog"
        aria-label={`Обучение: ${current.title}`}
        style={{ top: tipTop, left: tipLeft, width: tipW }}
      >
        <div className="tourTipCard">
          <p className="tourTipStep">{`Шаг ${step + 1} из ${STEPS.length}`}</p>
          <h3 className="tourTipTitle">{current.title}</h3>
          <p className="tourTipText">{current.text}</p>
          <div className="tourTipFooter">
            <span className="tourTipDots" aria-hidden="true">
              {dots}
            </span>
            <div className="tourTipActions">
              {!isLast ? (
                <button type="button" onClick={stop} className="tourSkip">
                  пропустить
                </button>
              ) : null}
              <button
                type="button"
                className="tourNext"
                onClick={() => {
                  if (isLast) {
                    stop();
                  } else {
                    const next = step + 1;
                    setStep(next);
                    measureSoon(next, 60);
                  }
                }}
              >
                {isLast ? "понятно" : "далее"}
                {isLast ? null : <ArrowRight width={13} height={13} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
