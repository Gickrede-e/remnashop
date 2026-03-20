import { redirect } from "next/navigation";

import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSession } from "@/lib/auth/session";
import { getUserById } from "@/lib/services/auth";
import { getMyReferralSummary } from "@/lib/services/referrals";
import { formatDateTime, maskEmail } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardReferralsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const [user, summary] = await Promise.all([getUserById(session.userId), getMyReferralSummary(session.userId)]);
  const referralLink = user ? `${process.env.NEXT_PUBLIC_SITE_URL}/register?ref=${user.referralCode}` : "";

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Реферальная ссылка</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="break-all rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-300">
            {referralLink || "Ссылка недоступна"}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Приглашённые пользователи</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.referredUsers.length === 0 ? (
              <EmptyState title="Пока без приглашений" description="Поделитесь ссылкой, чтобы начать получать награды." />
            ) : (
              <>
                <div className="grid gap-4 md:hidden">
                  {summary.referredUsers.map((userItem) => (
                    <div key={userItem.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-sm font-medium text-white">{maskEmail(userItem.email)}</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Регистрация</p>
                          <p className="mt-2 text-sm text-white">{formatDateTime(userItem.createdAt)}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Первый платёж</p>
                          <p className="mt-2 text-sm text-white">{formatDateTime(userItem.payments[0]?.paidAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Регистрация</TableHead>
                        <TableHead>Первый платёж</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.referredUsers.map((userItem) => (
                        <TableRow key={userItem.id}>
                          <TableCell>{maskEmail(userItem.email)}</TableCell>
                          <TableCell>{formatDateTime(userItem.createdAt)}</TableCell>
                          <TableCell>{formatDateTime(userItem.payments[0]?.paidAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Награды</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.rewards.length === 0 ? (
              <EmptyState title="Наград пока нет" description="После первого успешного платежа приглашённого пользователя награда появится здесь." />
            ) : (
              <>
                <div className="grid gap-4 md:hidden">
                  {summary.rewards.map((reward) => (
                    <div key={reward.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-sm font-medium text-white">{maskEmail(reward.referredUser.email)}</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Тип</p>
                          <p className="mt-2 text-sm text-white">{reward.rewardType}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Значение</p>
                          <p className="mt-2 text-sm text-white">{reward.rewardValue}</p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-zinc-500">{formatDateTime(reward.createdAt)}</p>
                    </div>
                  ))}
                </div>

                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Пользователь</TableHead>
                        <TableHead>Тип</TableHead>
                        <TableHead>Значение</TableHead>
                        <TableHead>Дата</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.rewards.map((reward) => (
                        <TableRow key={reward.id}>
                          <TableCell>{maskEmail(reward.referredUser.email)}</TableCell>
                          <TableCell>{reward.rewardType}</TableCell>
                          <TableCell>{reward.rewardValue}</TableCell>
                          <TableCell>{formatDateTime(reward.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
