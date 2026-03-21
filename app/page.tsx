import Link from "next/link";
import { ArrowRight, Check, CreditCard, Shield, Zap } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildLoginHref } from "@/lib/auth/navigation";
import { getSession } from "@/lib/auth/session";
import { marketingFaq } from "@/lib/constants";
import { publicEnv } from "@/lib/env";
import { getPublicPlans } from "@/lib/services/plans";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  const plans = await getPublicPlans();
  const purchaseHref = session ? "/dashboard/buy" : buildLoginHref("/dashboard/buy");

  const featuredPlan =
    plans.find((plan) => plan.slug === "pro") ??
    plans.find((plan) => Boolean(plan.highlight)) ??
    plans[0] ??
    null;
  const secondaryPlans = featuredPlan ? plans.filter((plan) => plan.id !== featuredPlan.id) : [];
  const minimumPlanPrice = plans.length ? Math.min(...plans.map((plan) => plan.price)) : null;
  const entryPriceLabel = minimumPlanPrice != null ? `от ${formatCurrency(minimumPlanPrice)}/мес` : "от 200 ₽/мес";

  const heroBenefits = [
    {
      title: "Мгновенная активация",
      text: "Доступ появляется сразу после оплаты, без ожидания и лишних шагов."
    },
    {
      title: "Прозрачный кабинет",
      text: "Тариф, история платежей и бонусы всегда под рукой в одном месте."
    }
  ];

  const showcaseItems = [
    {
      icon: Zap,
      title: "Быстрая активация",
      text: "Оплатили и сразу подключились."
    },
    {
      icon: Shield,
      title: "5 платформ",
      text: "Телефон, ноутбук и рабочий стол."
    },
    {
      icon: CreditCard,
      title: "Оплата онлайн",
      text: "Карты, СБП и электронные кошельки."
    }
  ];

  return (
    <div className="pb-24">
      <section className="container relative py-16 md:py-20 lg:py-24">
        <div className="pointer-events-none absolute -left-10 top-12 h-40 w-40 rounded-full bg-sky-500/8 blur-2xl md:h-56 md:w-56" />
        <div className="pointer-events-none absolute -right-8 top-0 h-52 w-52 rounded-full bg-cyan-400/10 blur-2xl md:h-72 md:w-72" />

        <div className="grid items-stretch gap-5 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="surface-feature relative overflow-hidden p-8 md:p-10 lg:p-12">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.1),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.12),transparent_38%)]" />
            <div className="relative flex h-full flex-col justify-between gap-8">
              <div className="space-y-6">
                <Badge variant="muted" className="w-fit border-white/10 bg-white/[0.04] text-zinc-300">
                  Приватный интернет без лишней сложности
                </Badge>

                <div className="space-y-5">
                  <h1 className="max-w-3xl text-5xl font-semibold leading-[0.94] tracking-tight md:text-7xl">
                    <span className="text-gradient">{publicEnv.NEXT_PUBLIC_SITE_NAME}</span> — ваш интернет, ваши правила
                  </h1>
                  <p className="max-w-2xl text-lg leading-8 text-zinc-300 md:text-2xl md:text-white/88">
                    Современный VPN с мгновенной активацией, понятным личным кабинетом и честными тарифами. Подключили —
                    работает.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <Button asChild size="lg" className="group rounded-2xl px-7">
                    <Link href={purchaseHref}>
                      Купить тариф
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300 transition hover:text-white"
                  >
                    Посмотреть тарифы
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

            </div>
          </div>

          <Card className="surface-soft relative overflow-hidden p-6 md:p-8 lg:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.1),transparent_34%)]" />
            <div className="relative flex h-full flex-col justify-between gap-8">
              <div className="space-y-5">
                <Badge variant="secondary" className="w-fit border-sky-400/25 bg-sky-400/10 text-sky-100">
                  Безопасное подключение
                </Badge>
                <div className="space-y-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Старт без ожидания</p>
                  <p className="text-5xl font-semibold leading-none text-white md:text-6xl">{entryPriceLabel}</p>
                  <p className="max-w-sm text-sm leading-7 text-zinc-400">
                    Шифрование трафика, честная цена и понятная настройка без переписки с поддержкой.
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                {showcaseItems.map((item) => (
                  <div
                    key={item.title}
                    className="flex items-start gap-4 rounded-[22px] border border-white/8 bg-black/20 px-4 py-4 transition-transform transition-colors duration-200 md:hover:-translate-y-0.5 md:hover:border-white/14"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06]">
                      <item.icon className="h-5 w-5 text-sky-200" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="text-sm leading-6 text-zinc-400">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {heroBenefits.map((item) => (
            <div
              key={item.title}
              className="surface-soft flex items-start gap-4 px-5 py-5 transition-transform transition-colors duration-200 md:hover:-translate-y-0.5 md:hover:border-white/14"
            >
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-400/10">
                <Check className="h-4 w-4 text-sky-200" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-white">{item.title}</p>
                <p className="text-sm leading-6 text-zinc-400">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container py-12 md:py-14">
        <div className="mb-6 flex justify-end">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300 transition hover:text-white"
          >
            Все тарифы
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {featuredPlan ? (
          <div className="grid gap-4 xl:grid-cols-4">
            <Card className="surface-feature overflow-hidden xl:col-span-2">
              <CardHeader className="gap-5 p-8 md:p-9">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={featuredPlan.highlight ? "default" : "secondary"}>
                    {featuredPlan.highlight || "Рекомендуемый тариф"}
                  </Badge>
                  <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">Лучший баланс цены и трафика</span>
                </div>

                <div className="space-y-3">
                  <CardTitle className="text-3xl md:text-4xl">{featuredPlan.name}</CardTitle>
                  <p className="max-w-xl text-sm leading-7 text-zinc-400">
                    {featuredPlan.description ||
                      "Полный доступ к VPN, продление без потери остатка и аккуратный личный кабинет без лишних действий."}
                  </p>
                </div>
              </CardHeader>

              <CardContent className="grid gap-6 p-8 pt-0 md:p-9 md:pt-0 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Цена</p>
                    <p className="text-5xl font-semibold text-white">{formatCurrency(featuredPlan.price)}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="surface-soft px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Срок</p>
                      <p className="mt-2 text-xl font-semibold text-white">{featuredPlan.durationDays} дней</p>
                    </div>
                    <div className="surface-soft px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Трафик</p>
                      <p className="mt-2 text-xl font-semibold text-white">{featuredPlan.trafficGB} ГБ</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-6">
                  <ul className="grid gap-3 text-sm text-zinc-300">
                    {[
                      "Моментальная активация после оплаты",
                      "Платежи и статус подписки всегда видны в кабинете",
                      "Продление суммируется с оставшимся временем и трафиком"
                    ].map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-3 rounded-[20px] border border-white/8 bg-black/20 px-4 py-4"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-sky-200" />
                        <span className="leading-6">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Button asChild className="w-full rounded-2xl sm:w-auto">
                    <Link href={purchaseHref}>
                      Купить тариф
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {secondaryPlans.map((plan) => (
              <Card
                key={plan.id}
                className="surface-soft flex h-full flex-col transition-transform transition-colors duration-200 md:hover:-translate-y-0.5 md:hover:border-sky-400/20"
              >
                <CardHeader className="gap-4 p-6">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    {plan.highlight ? <Badge>{plan.highlight}</Badge> : null}
                  </div>
                  <div className="space-y-2">
                    <p className="text-3xl font-semibold text-white">{formatCurrency(plan.price)}</p>
                    <p className="text-sm text-zinc-500">
                      {plan.durationDays} дней • {plan.trafficGB} ГБ
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-5 p-6 pt-0">
                  <p className="flex-1 text-sm leading-7 text-zinc-400">
                    {plan.description ||
                      "Полный доступ к VPN, личный кабинет с историей платежей, умное продление и поддержка промокодов."}
                  </p>
                  <Button asChild className="w-full rounded-2xl">
                    <Link href={purchaseHref}>Купить тариф</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="surface-soft p-8 text-center">
            <div className="space-y-4">
              <p className="text-2xl font-semibold text-white">Тарифы скоро появятся</p>
              <p className="mx-auto max-w-lg text-sm leading-7 text-zinc-400">
                Главная уже обновлена, а тарифы временно недоступны. Проверьте раздел FAQ или вернитесь чуть позже.
              </p>
              <div className="flex justify-center">
                <Button asChild className="rounded-2xl">
                  <Link href="/faq">Открыть FAQ</Link>
                </Button>
              </div>
            </div>
          </Card>
        )}
      </section>

      <section className="container py-12 md:py-14">
        <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-5">
            <Badge variant="muted" className="w-fit border-white/10 bg-white/[0.04] text-zinc-400">
              FAQ
            </Badge>
            <div className="space-y-3">
              <h2 className="max-w-md text-2xl font-semibold md:text-3xl">Частые вопросы перед подключением</h2>
              <p className="max-w-md text-sm leading-7 text-zinc-400">
                Короткие ответы на основные вопросы перед покупкой и первым подключением.
              </p>
            </div>

            <div className="surface-soft flex items-start gap-4 rounded-[22px] px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-400/10">
                <Shield className="h-4 w-4 text-sky-200" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-white">GickVPN шифрует ваш трафик и скрывает IP-адрес.</p>
                <p className="text-sm leading-6 text-zinc-400">Ваши данные — только ваши.</p>
              </div>
            </div>
          </div>

          <Accordion className="space-y-2" collapsible type="single">
            {marketingFaq.map((item, index) => (
              <AccordionItem
                key={item.question}
                value={`faq-${index}`}
                className="surface-soft overflow-hidden rounded-[22px] border-white/8 px-5 data-[state=open]:bg-white/[0.05]"
              >
                <AccordionTrigger>{item.question}</AccordionTrigger>
                <AccordionContent>{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </div>
  );
}
