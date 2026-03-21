import { RegisterForm } from "@/components/auth/register-form";
import { sanitizeNextPath } from "@/lib/auth/navigation";

export default async function RegisterPage({
  searchParams
}: {
  searchParams?: Promise<{ ref?: string; next?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const referralCode = resolvedSearchParams?.ref;
  const nextPath = sanitizeNextPath(resolvedSearchParams?.next);

  return (
    <div className="container py-8 sm:py-10 lg:py-14">
      <div className="grid min-h-[calc(100vh-13rem)] gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(380px,0.8fr)] lg:items-center">
        <section className="surface-feature p-5 sm:p-7 lg:p-8">
          <p className="section-kicker">Регистрация</p>
          <h1 className="mt-4 max-w-xl text-3xl font-semibold text-white sm:text-4xl">
            Создайте аккаунт и подключите GickVPN за пару минут.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-300 sm:text-base">
            После регистрации вы сможете выбрать тариф, оплатить удобным способом и сразу получить доступ
            в личном кабинете.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="surface-soft px-4 py-4">
              <p className="text-sm font-medium text-white">Честные тарифы</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">Срок, цена и лимит трафика видны заранее, без скрытых условий.</p>
            </div>
            <div className="surface-soft px-4 py-4">
              <p className="text-sm font-medium text-white">Бонусы и промокоды</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">Реферальная ссылка и промокоды доступны сразу после входа.</p>
            </div>
          </div>
        </section>

        <RegisterForm referralCode={referralCode} nextPath={nextPath} />
      </div>
    </div>
  );
}
