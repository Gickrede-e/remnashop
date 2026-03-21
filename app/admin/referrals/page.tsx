import { AdminRecordCard, AdminRecordEmptyState, AdminRecordList } from "@/components/blocks/admin/admin-record-list";
import { ScreenHeader } from "@/components/shell/screen-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getReferralAdminOverview } from "@/lib/services/referrals";
import { formatDateTime, maskEmail } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminReferralsPage() {
  const overview = await getReferralAdminOverview();

  return (
    <div className="grid gap-4 sm:gap-6">
      <ScreenHeader
        eyebrow="Админка"
        title="Рефералы"
        description="Top referrers и недавние награды без table-first перегруза на телефонах."
      />

      <div className="surface-soft grid gap-3 p-4 sm:grid-cols-3">
        <SummaryItem label="Всего рефералов" value={String(overview.totalReferrals)} />
        <SummaryItem label="Топ рефереров" value={String(overview.topReferrers.length)} />
        <SummaryItem label="Последние награды" value={String(overview.rewards.length)} />
      </div>

      <AdminRecordList
        title="Топ рефереров"
        description="Показываем только код и число приглашений, чтобы быстро решить, в чей профиль проваливаться дальше."
      >
        {overview.topReferrers.length === 0 ? (
          <AdminRecordEmptyState
            title="Реферальных лидеров пока нет"
            description="Как только пользователи начнут приводить новых клиентов, список появится здесь."
          />
        ) : (
          <>
            <div className="grid gap-3 xl:hidden">
              {overview.topReferrers.map((user) => (
                <AdminRecordCard
                  key={user.id}
                  title={maskEmail(user.email)}
                  metadata={[
                    { label: "Код", value: user.referralCode },
                    { label: "Приглашений", value: String(user._count.referrals) }
                  ]}
                />
              ))}
            </div>

            <div className="hidden xl:block">
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
          </>
        )}
      </AdminRecordList>

      <AdminRecordList
        title="Последние награды"
        description="История начислений, достаточная для быстрой сверки без разворачивания тяжёлой таблицы."
      >
        {overview.rewards.length === 0 ? (
          <AdminRecordEmptyState
            title="Наград пока нет"
            description="Когда появятся первые успешные реферальные оплаты, награды появятся в этом списке."
          />
        ) : (
          <>
            <div className="grid gap-3 xl:hidden">
              {overview.rewards.map((reward) => (
                <AdminRecordCard
                  key={reward.id}
                  title={maskEmail(reward.owner.email)}
                  subtitle={`За ${maskEmail(reward.referredUser.email)}`}
                  metadata={[
                    { label: "Тип", value: reward.rewardType },
                    { label: "Значение", value: String(reward.rewardValue) },
                    { label: "Дата", value: formatDateTime(reward.createdAt) }
                  ]}
                />
              ))}
            </div>

            <div className="hidden xl:block">
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
          </>
        )}
      </AdminRecordList>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="text-sm font-medium text-white">{value}</p>
    </div>
  );
}
