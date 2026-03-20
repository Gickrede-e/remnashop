import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getReferralAdminOverview } from "@/lib/services/referrals";
import { formatDateTime, maskEmail } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminReferralsPage() {
  const overview = await getReferralAdminOverview();

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Всего рефералов</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-white">{overview.totalReferrals}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Топ рефереров</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-zinc-300">{overview.topReferrers.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Последние награды</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-zinc-300">{overview.rewards.length}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Топ рефереров</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:hidden">
            {overview.topReferrers.map((user) => (
              <div key={user.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-medium text-white">{maskEmail(user.email)}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Код</p>
                    <p className="mt-2 break-all text-sm text-white">{user.referralCode}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Количество</p>
                    <p className="mt-2 text-sm text-white">{user._count.referrals}</p>
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
                  <TableHead>Код</TableHead>
                  <TableHead>Количество</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.topReferrers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{maskEmail(user.email)}</TableCell>
                    <TableCell className="max-w-[220px] break-all">{user.referralCode}</TableCell>
                    <TableCell>{user._count.referrals}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Награды</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:hidden">
            {overview.rewards.map((reward) => (
              <div key={reward.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">{maskEmail(reward.owner.email)}</p>
                  <p className="text-sm text-zinc-400">За {maskEmail(reward.referredUser.email)}</p>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Тип</p>
                    <p className="mt-2 break-words text-sm text-white">{reward.rewardType}</p>
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
                  <TableHead>Кому</TableHead>
                  <TableHead>За кого</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Значение</TableHead>
                  <TableHead>Дата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.rewards.map((reward) => (
                  <TableRow key={reward.id}>
                    <TableCell>{maskEmail(reward.owner.email)}</TableCell>
                    <TableCell>{maskEmail(reward.referredUser.email)}</TableCell>
                    <TableCell>{reward.rewardType}</TableCell>
                    <TableCell>{reward.rewardValue}</TableCell>
                    <TableCell>{formatDateTime(reward.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
