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
    <>
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">Личный кабинет</p>
        <h1 className="text-4xl font-semibold text-white">Статус подписки и доступ</h1>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Подписка</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
          <CardHeader>
            <CardTitle>Трафик</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-zinc-400">Лимит</p>
            <p className="text-2xl font-semibold text-white">{formatBytes(subscription?.trafficLimitBytes)}</p>
            <p className="text-sm text-zinc-400">Использовано {formatBytes(subscription?.trafficUsedBytes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Конфиг и действия</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Link href="/dashboard/buy">
              <Button className="w-full justify-between">
                Продлить или купить
                <CreditCard className="h-4 w-4" />
              </Button>
            </Link>
            {activeUser?.remnawaveShortUuid ? (
              <a
                href={`${process.env.REMNAWAVE_BASE_URL}/api/sub/${activeUser.remnawaveShortUuid}`}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="secondary" className="w-full justify-between">
                  Открыть subscription URL
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Реферальная ссылка</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
    </>
  );
}
