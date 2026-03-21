import { LoginForm } from "@/components/auth/login-form";
import { sanitizeNextPath } from "@/lib/auth/navigation";
import { env } from "@/lib/env";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextPath = sanitizeNextPath(resolvedSearchParams?.next);

  return (
    <div className="container py-8 sm:py-10 lg:py-14">
      <div className="grid min-h-[calc(100vh-13rem)] gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(380px,0.8fr)] lg:items-center">
        <section className="surface-feature p-5 sm:p-7 lg:p-8">
          <p className="section-kicker">Вход</p>
          <h1 className="mt-4 max-w-xl text-3xl font-semibold text-white sm:text-4xl">
            Вернитесь в кабинет и продолжайте с того места, где остановились.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-300 sm:text-base">
            В кабинете доступны подписка, история платежей, настройка подключения и реферальная ссылка.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="surface-soft px-4 py-4">
              <p className="text-sm font-medium text-white">Мгновенный доступ</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">После входа сразу доступны покупка, продление и настройка.</p>
            </div>
            <div className="surface-soft px-4 py-4">
              <p className="text-sm font-medium text-white">Без лишних шагов</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">Email-пароль или Telegram, если он уже подключён к аккаунту.</p>
            </div>
          </div>
        </section>

        <LoginForm telegramUsername={env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME} nextPath={nextPath} />
      </div>
    </div>
  );
}
