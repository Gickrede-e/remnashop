// app/page.tsx
//
// Лендинг «Hero с геометрией» — шаблон из Claude Design
// (проект GickShop Design System, templates/landing-hero).
// Вместо фоновой иллюстрации — интерактивные кубы в невесомости
// (<CubeField>: parallax за курсором, ударная волна по клику),
// словознак с глитчем и котом-пасхалкой, ротация слоганов
// «дешифровкой» (<HeroSlogans>).

import Link from "next/link";

import { HeroSlogans } from "@/components/blocks/landing/hero-slogans";
import { AsciiCat } from "@/components/effects/ascii-cat";
import { CubeField } from "@/components/effects/cube-field";

import styles from "./landing.module.css";

export const metadata = {
  title: "GickShop — приватный сервис",
  description: "Приватный сервис без журналов и авто-продлений. Подключение по ссылке за 30 секунд. От 200 ₽ в месяц."
};

export default function HomePage() {
  return (
    <main className={styles.landing}>
      <CubeField count={14} style={{ position: "absolute", inset: 0, zIndex: 0 }} />

      {/* верх */}
      <header className={styles.nav}>
        <div className={styles.heroLogo} data-logo="true">
          <AsciiCat placement="landing" />
          <span className={styles.heroLogoGlitch}>
            gickshop
            <span className={styles.heroLogoCursor} />
          </span>
        </div>
        <Link href="/login" className={styles.navCta}>
          КАБИНЕТ <span aria-hidden="true">→</span>
        </Link>
      </header>

      {/* контент */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <HeroSlogans />

          <p className={styles.heroLead}>
            Приватный сервис без журналов и авто-продлений. Подключение по ссылке за 30 секунд. От 200&nbsp;₽ в месяц.
          </p>

          <div className={styles.heroActions}>
            <Link href="/register" className={styles.btnPrimary}>
              СОЗДАТЬ АККАУНТ <span aria-hidden="true">→</span>
            </Link>
            <Link href="/login" className={styles.btnSecondary}>
              ВОЙТИ
            </Link>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className={styles.footer}>
        <span>© 2026 GICKSHOP</span>
        <Link href="/terms" className={styles.footerLink}>
          СОГЛАШЕНИЕ
        </Link>
      </footer>
    </main>
  );
}
