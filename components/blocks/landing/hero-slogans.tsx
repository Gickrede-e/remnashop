"use client";

// components/blocks/landing/hero-slogans.tsx
//
// Ротация слоганов «дешифровкой»: случайные глифы слева направо складываются
// в следующий слоган (порт логики шаблона landing-hero из Claude Design).
// Скрытые span-двойники резервируют высоту под самый высокий вариант, чтобы
// блок не прыгал. При prefers-reduced-motion остаётся статичный первый слоган
// (он же рендерится на сервере).

import { useEffect, useRef, useState } from "react";

import styles from "@/app/landing.module.css";

type Slogan = { plain: string; accent: string };

const SLOGANS: Slogan[] = [
  { plain: "Ваш трафик —", accent: "не наше дело." },
  { plain: "Мы не знаем, что вы смотрите.", accent: "И знать не хотим." },
  { plain: "Без логов. Без лимитов.", accent: "Без драмы." }
];

const GLYPHS = "#$%&@*+=<>/!?01";
const HOLD_MS = 9000;
const DECODE_MS = 1500;
const STEP_MS = 45;

function scramble(target: string, progress: number) {
  const solved = Math.floor(progress * target.length);
  let out = "";
  for (let i = 0; i < target.length; i++) {
    const ch = target[i];
    if (i < solved || ch === " " || ch === " ") out += ch;
    else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
  }
  return out;
}

export function HeroSlogans() {
  const [view, setView] = useState<Slogan>(SLOGANS[0]);
  const idxRef = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let hold: ReturnType<typeof setTimeout>;
    let tick: ReturnType<typeof setInterval>;

    const schedule = () => {
      hold = setTimeout(decodeNext, HOLD_MS);
    };

    const decodeNext = () => {
      const next = SLOGANS[(idxRef.current + 1) % SLOGANS.length];
      const t0 = performance.now();
      tick = setInterval(() => {
        const p = Math.min(1, (performance.now() - t0) / DECODE_MS);
        const pa = Math.min(1, p / 0.8);
        const pb = Math.max(0, Math.min(1, (p - 0.25) / 0.75));
        if (p >= 1) {
          clearInterval(tick);
          idxRef.current = (idxRef.current + 1) % SLOGANS.length;
          setView(next);
          schedule();
        } else {
          setView({ plain: scramble(next.plain, pa), accent: scramble(next.accent, pb) });
        }
      }, STEP_MS);
    };

    schedule();
    return () => {
      clearTimeout(hold);
      clearInterval(tick);
    };
  }, []);

  return (
    <h1 className={styles.heroTitle}>
      <span className={styles.sloganLive}>
        {view.plain}
        <br />
        <span className={styles.sloganAccent}>{view.accent}</span>
        <span className={styles.sloganCursor} aria-hidden="true" />
      </span>
      {SLOGANS.map((s) => (
        <span key={s.plain} className={styles.sloganGhost} aria-hidden="true">
          {s.plain}
          <br />
          {s.accent}
          <span className={styles.sloganGhostCursor} />
        </span>
      ))}
    </h1>
  );
}
