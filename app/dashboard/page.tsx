import Link from "next/link";
import { redirect } from "next/navigation";
import { CreditCard, ExternalLink, Share2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubscriptionStatusBadge } from "@/components/shared/status-badge";
import { getSession } from "@/lib/auth/session";
import { getUserById } from "@/lib/services/auth";
import { syncUserSubscription } from "@/lib/services/subscriptions";
import { formatBytes, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const [user, syncedUser] = await Promise.all([
    getUserById(session.userId),
    syncUserSubscription(session.userId)
  ]);

  const activeUser = syncedUser ?? user;
  const subscription = activeUser?.subscription;
  const referralLink = user ? `${process.env.NEXT_PUBLIC_SITE_URL}/register?ref=${user.referralCode}` : "";

  return (
    <div className="grid gap-6">
      <section className="surface-feature p-5 sm:p-7">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)] xl:items-end">
          <div className="space-y-4">
            <p className="section-kicker">Личный кабинет</p>
            <div className="space-y-3">
              <h1 className="text-2xl font-semibold text-white sm:text-3xl lg:text-4xl">Статус подписки и доступ</h1>
              <p className="max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
                Здесь видно актуальный статус доступа, остаток трафика, ссылку для подключения и быстрые
                действия по продлению подписки.
              </p>
            </div>
          </div>

          <div className="surface-soft grid gap-3 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-zinc-400">Текущий статус</span>
              {subscription ? <SubscriptionStatusBadge status={subscription.status} /> : <span className="text-sm text-zinc-500">Нет подписки</span>}
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-zinc-400">Тариф</span>
              <span className="text-sm font-medium text-white">{subscription?.plan?.name ?? "Не выбран"}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-zinc-400">Доступ до</span>
              <span className="text-sm font-medium text-white">{formatDateTime(subscription?.expiresAt)}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="p-5 sm:p-6">
            <CardTitle>Подписка</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-5 pt-0 sm:p-6 sm:pt-0">
            {subscription ? (
              <>
                <SubscriptionStatusBadge status={subscription.status} />
                <p className="text-2xl font-semibold text-white">{subscription.plan?.name ?? "Без тарифа"}</p>
                <p className="text-sm text-zinc-400">Действует до {formatDateTime(subscription.expiresAt)}</p>
              </>
            ) : (
              <p className="text-sm text-zinc-400">Подписка ещё не оформлена.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-5 sm:p-6">
            <CardTitle>Трафик</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-5 pt-0 sm:p-6 sm:pt-0">
            <p className="text-sm text-zinc-400">Лимит</p>
            <p className="text-2xl font-semibold text-white">{formatBytes(subscription?.trafficLimitBytes)}</p>
            <p className="text-sm text-zinc-400">Использовано {formatBytes(subscription?.trafficUsedBytes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-5 sm:p-6">
            <CardTitle>Конфиг и действия</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-5 pt-0 sm:p-6 sm:pt-0">
            <Button asChild className="w-full justify-between">
              <Link href="/dashboard/buy">
                Продлить или купить
                <CreditCard className="h-4 w-4" />
              </Link>
            </Button>
            {activeUser?.remnawaveShortUuid ? (
              <Button asChild variant="secondary" className="w-full justify-between">
                <a
                  href={`${process.env.REMNAWAVE_BASE_URL}/api/sub/${activeUser.remnawaveShortUuid}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Открыть subscription URL
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-5 sm:p-6">
          <CardTitle>Реферальная ссылка</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-5 pt-0 sm:p-6 sm:pt-0">
          <div className="break-all rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-300">
            {referralLink || "Ссылка появится после загрузки профиля."}
          </div>
          <Link href="/dashboard/referrals">
            <Button variant="secondary" className="w-full sm:w-auto">
              Открыть реферальную панель
              <Share2 className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
