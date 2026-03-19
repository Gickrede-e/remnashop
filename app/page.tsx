import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Check,
  CreditCard,
  Globe,
  MonitorSmartphone,
  Shield,
  TimerReset,
  Zap
} from "lucide-react";

import { marketingFaq } from "@/lib/constants";
import { getSession } from "@/lib/auth/session";
import { buildLoginHref } from "@/lib/auth/navigation";
import { getPublicPlans } from "@/lib/services/plans";
import { formatCurrency } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const highlights = [
  {
    icon: Shield,
    title: "Контур доступа под контролем",
    text: "Аккаунт, подписка и статус пользователя синхронизируются между GickVPN и Remnawave без ручного администрирования."
  },
  {
    icon: Zap,
    title: "Активация после оплаты",
    text: "Webhook провайдера сразу продлевает доступ, обновляет лимит трафика и отправляет уведомления."
  },
  {
    icon: TimerReset,
    title: "Продление без потерь остатка",
    text: "Если подписка активна, новые дни и гигабайты аккуратно добавляются поверх текущего срока и лимита."
  }
];

const steps = [
  {
    step: "01",
    title: "Выбираете тариф",
    text: "Стартовый, Про, Ультра или годовой. Сразу видно срок, лимит трафика и метки выгоды."
  },
  {
    step: "02",
    title: "Оплачиваете удобным способом",
    text: "ЮKassa и Platega доступны прямо в кабинете. Промокод и итоговая цена считаются до перехода на оплату."
  },
  {
    step: "03",
    title: "Получаете готовый доступ",
    text: "После подтверждения платежа кабинет обновляет статус, subscription URL и историю операций."
  }
];

const platformBadges = ["iOS", "Android", "Windows", "macOS", "Linux", "Telegram"];

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  const plans = await getPublicPlans();
  const featuredPlan = plans.find((plan) => Boolean(plan.highlight)) ?? plans[0];
  const purchaseHref = session ? "/dashboard/buy" : buildLoginHref("/dashboard/buy");

  return (
    <div className="pb-20">
      <section className="container py-10 md:py-16 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="space-y-8">
            <div className="space-y-5">
              <Badge className="w-fit border border-violet-400/20 bg-violet-500/10 text-violet-100" variant="secondary">
                GickVPN • VPN-подписки с кабинетом и автоматикой
              </Badge>
              <div className="space-y-5">
                <h1 className="max-w-4xl text-5xl font-semibold leading-[0.95] tracking-tight md:text-7xl">
                  VPN-сервис, который выглядит как <span className="text-gradient">нормальный продукт</span>, а не форма оплаты.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-zinc-300 md:text-xl">
                  Тёмный кабинет, моментальная активация, две платёжные системы, история операций, реферальная система и админка без ручной рутины.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="group">
                <Link href="/pricing">
                  Перейти к тарифам
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/setup">Посмотреть настройку</Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Платёжные провайдеры", value: "2", hint: "ЮKassa + Platega" },
                { label: "Платформы", value: "6", hint: "Телефон и десктоп" },
                { label: "Сценарии тарифа", value: String(plans.length), hint: "От базового до годового" }
              ].map((item) => (
                <div key={item.label} className="rounded-[26px] border border-white/10 bg-white/[0.035] p-4 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">{item.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
                  <p className="mt-2 text-sm text-zinc-400">{item.hint}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Статус подписки синхронизируется с Remnawave",
                "Поддержка промокодов и реферальных наград",
                "История платежей и subscription URL в кабинете",
                "Ручное управление пользователями из админки"
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300"
                >
                  <Check className="h-4 w-4 text-emerald-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-10 top-8 h-28 w-28 rounded-full bg-violet-500/25 blur-3xl" />
            <div className="absolute -right-6 bottom-10 h-36 w-36 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="relative space-y-4 rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,14,22,0.94),rgba(7,7,12,0.88))] p-5 shadow-[0_24px_100px_rgba(76,29,149,0.28)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4 rounded-[26px] border border-white/10 bg-white/[0.04] px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Control Room</p>
                  <p className="mt-2 text-xl font-semibold text-white">GickVPN Dashboard</p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  ACTIVE
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-4 rounded-[26px] border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-zinc-400">Текущий тариф</p>
                      <p className="mt-2 text-3xl font-semibold text-white">{featuredPlan?.name ?? "Pro"}</p>
                    </div>
                    {featuredPlan?.highlight ? <Badge>{featuredPlan.highlight}</Badge> : null}
                  </div>
                  <div className="grid gap-3">
                    {[
                      {
                        icon: CreditCard,
                        label: "Сумма продления",
                        value: featuredPlan ? formatCurrency(featuredPlan.price) : "299 ₽"
                      },
                      {
                        icon: Activity,
                        label: "Лимит трафика",
                        value: featuredPlan ? `${featuredPlan.trafficGB} ГБ` : "150 ГБ"
                      },
                      {
                        icon: Globe,
                        label: "Срок доступа",
                        value: featuredPlan ? `${featuredPlan.durationDays} дней` : "30 дней"
                      }
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
                          <item.icon className="h-3.5 w-3.5" />
                          {item.label}
                        </div>
                        <p className="mt-3 text-lg font-medium text-white">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 rounded-[26px] border border-white/10 bg-gradient-to-br from-violet-500/12 via-transparent to-blue-500/12 p-4">
                  <div className="space-y-2">
                    <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Как это ощущается</p>
                    <h2 className="text-2xl font-semibold text-white">Кабинет без серости и без ручных действий</h2>
                    <p className="text-sm leading-7 text-zinc-300">
                      Покупка, продление, контроль трафика и доступ к конфигу собраны в одном потоке.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { label: "Оплата через ЮKassa", state: "онлайн" },
                      { label: "Webhook подтвердил платёж", state: "автоматически" },
                      { label: "Remnawave обновил подписку", state: "синхронизировано" }
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                        <span className="text-sm text-zinc-200">{item.label}</span>
                        <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs text-blue-200">
                          {item.state}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {["YooKassa", "Platega", "Remnawave", "Telegram"].map((item) => (
                      <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-center text-sm text-zinc-300">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-8">
        <div className="grid gap-4 lg:grid-cols-3">
          {highlights.map((item, index) => (
            <Card
              key={item.title}
              className={index === 1 ? "border-violet-400/25 bg-gradient-to-br from-violet-500/10 to-blue-500/10" : ""}
            >
              <CardHeader className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06]">
                  <item.icon className="h-5 w-5 text-violet-200" />
                </div>
                <CardTitle className="text-2xl">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-7 text-zinc-300">{item.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container py-14">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.26em] text-zinc-500">Поток покупки</p>
            <h2 className="max-w-2xl text-3xl font-semibold md:text-4xl">
              Всё, что должно происходить после оплаты, уже встроено в продукт.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-zinc-400">
            Это не просто сайт-визитка. Это магазин подписок с рабочим кабинетом, автоматическим
            провижонингом и админским контуром.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {steps.map((step) => (
            <div key={step.step} className="rounded-[28px] border border-white/10 bg-white/[0.035] p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">{step.step}</p>
              <h3 className="mt-4 text-2xl font-semibold text-white">{step.title}</h3>
              <p className="mt-4 text-sm leading-7 text-zinc-300">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container py-14">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.26em] text-zinc-500">Тарифы</p>
            <h2 className="mt-2 text-3xl font-semibold md:text-4xl">Линейка без визуальной каши</h2>
          </div>
          <Button asChild variant="ghost">
            <Link href="/pricing">Открыть все тарифы</Link>
          </Button>
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={
                plan.highlight
                  ? "border-violet-400/30 bg-gradient-to-b from-violet-500/10 to-transparent shadow-[0_24px_80px_rgba(76,29,149,0.22)]"
                  : ""
              }
            >
              <CardHeader className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  {plan.highlight ? <Badge>{plan.highlight}</Badge> : null}
                </div>
                <div>
                  <p className="text-4xl font-semibold text-white">{formatCurrency(plan.price)}</p>
                  <p className="mt-2 text-sm text-zinc-400">
                    {plan.durationDays} дней • {plan.trafficGB} ГБ
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-sm leading-7 text-zinc-300">
                  {plan.description || "Подписка с прозрачной логикой продления, лимитом трафика и доступом в кабинет."}
                </p>
                <ul className="space-y-3 text-sm text-zinc-300">
                  {[
                    "История платежей и статусов",
                    "Продление поверх активного периода",
                    "Поддержка промокодов и referrals"
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-300" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full">
                  <Link href={purchaseHref}>Купить тариф</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container py-14">
        <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.035] p-6">
            <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Настройка</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Клиенты и инструкции уже разложены по платформам</h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-zinc-300">
              Не нужно отправлять пользователю набор ссылок вручную. На отдельной странице есть инструкции
              для всех ключевых устройств.
            </p>
            <Button asChild className="mt-6">
              <Link href="/setup">Открыть setup</Link>
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {platformBadges.map((item) => (
              <div
                key={item}
                className="flex min-h-[116px] flex-col justify-between rounded-[26px] border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-5"
              >
                <MonitorSmartphone className="h-5 w-5 text-blue-200" />
                <div>
                  <p className="text-lg font-medium text-white">{item}</p>
                  <p className="mt-2 text-sm text-zinc-400">Пошаговый сценарий подключения и получения subscription URL.</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-14">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.26em] text-zinc-500">FAQ</p>
            <h2 className="mt-2 text-3xl font-semibold md:text-4xl">Частые вопросы до покупки</h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-zinc-400">
            Секция оставлена компактной: короткие ответы до оплаты, а не перегруженная база знаний на первом экране.
          </p>
        </div>
        <Accordion className="space-y-3" collapsible type="single">
          {marketingFaq.slice(0, 3).map((item, index) => (
            <AccordionItem key={item.question} value={`faq-${index}`}>
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionContent>{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
