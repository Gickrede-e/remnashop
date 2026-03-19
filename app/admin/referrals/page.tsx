import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getReferralAdminOverview } from "@/lib/services/referrals";
import { formatDateTime, maskEmail } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminReferralsPage() {
  const overview = await getReferralAdminOverview();

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
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
        <CardContent>
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
                  <TableCell>{user.referralCode}</TableCell>
                  <TableCell>{user._count.referrals}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Награды</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
