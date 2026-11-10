import Link from "next/link";

import { LEGAL_ENTITY } from "@/lib/constants";
import { publicEnv } from "@/lib/public-env";

import { TERMS_EDITION_DATE, TERMS_SECTIONS, type TermsBlock } from "./content";
import styles from "./terms.module.css";

export const metadata = {
  title: "Пользовательское соглашение — GickShop",
  description: "Пользовательское соглашение, политика конфиденциальности и реквизиты сервиса GickShop."
};

function renderBlock(block: TermsBlock, key: number) {
  if (typeof block === "string") {
    return <p key={key}>{block}</p>;
  }

  return (
    <ul key={key}>
      {block.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default function TermsPage() {
  const supportUrl = publicEnv.NEXT_PUBLIC_SUPPORT_TELEGRAM_URL.trim();

  return (
    <main className={styles.page}>
      <header className={styles.nav}>
        <Link href="/" className={styles.logo}>
          gickshop
        </Link>
      </header>

      <article className={styles.article}>
        <h1>Пользовательское соглашение сервиса «GickShop» (GickVPN)</h1>
        <p className={styles.edition}>Редакция от {TERMS_EDITION_DATE}</p>

        {TERMS_SECTIONS.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            {section.blocks.map(renderBlock)}
          </section>
        ))}

        <section id="requisites">
          <h2>15. Реквизиты и контакты</h2>
          <dl className={styles.requisites}>
            <dt>Исполнитель</dt>
            <dd>{LEGAL_ENTITY.name}</dd>
            <dt>ИНН</dt>
            <dd>{LEGAL_ENTITY.inn}</dd>
            <dt>ОГРНИП</dt>
            <dd>{LEGAL_ENTITY.ogrnip}</dd>
            <dt>Сайт</dt>
            <dd>gickshop.net</dd>
            {supportUrl ? (
              <>
                <dt>Поддержка</dt>
                <dd>
                  <a href={supportUrl} target="_blank" rel="noreferrer">
                    {supportUrl}
                  </a>
                </dd>
              </>
            ) : null}
          </dl>
        </section>
      </article>
    </main>
  );
}
