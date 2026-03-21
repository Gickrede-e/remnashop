import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, maskEmail } from "@/lib/utils";

type ReferredUserItem = {
  id: string;
  email: string;
  createdAt: Date;
  payments: Array<{
    paidAt: Date | null;
  }>;
};

type RewardItem = {
  id: string;
  rewardType: string;
  rewardValue: number;
  createdAt: Date;
  referredUser: {
    email: string;
  };
};

type ReferralSummaryBlocksProps = {
  referralLink: string;
  referredUsers: ReferredUserItem[];
  rewards: RewardItem[];
};

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function SectionEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-zinc-300">
      <p className="font-medium text-white">{title}</p>
      <p className="mt-2 leading-6 text-zinc-400">{description}</p>
    </div>
  );
}

function ReferralLinkCard({ referralLink, referredUsers, rewards }: ReferralSummaryBlocksProps) {
  const successfulReferrals = referredUsers.filter((userItem) => userItem.payments.length > 0).length;

  return (
    <Card className="surface-feature">
      <CardHeader className="space-y-4 p-5 sm:p-6">
        <div className="space-y-2">
          <CardTitle className="text-xl text-white sm:text-2xl">Реферальная ссылка</CardTitle>
          <p className="max-w-2xl text-sm leading-6 text-zinc-300">
            Приглашайте друзей по своей ссылке и отслеживайте, кто уже зарегистрировался и какие награды были
            начислены.
          </p>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4 p-5 pt-0 sm:p-6 sm:pt-0">
        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-200">
          <p className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-500">Ссылка для приглашений</p>
          <p className="break-all">{referralLink || "Ссылка недоступна"}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryChip label="Приглашено" value={String(referredUsers.length)} />
          <SummaryChip label="С оплатой" value={String(successfulReferrals)} />
          <SummaryChip label="Наград" value={String(rewards.length)} />
        </div>
      </CardContent>
    </Card>
  );
}

function InvitedUsersSection({ referredUsers }: Pick<ReferralSummaryBlocksProps, "referredUsers">) {
  return (
    <Card>
      <CardHeader className="space-y-2 p-5 pb-3 sm:p-6 sm:pb-4">
        <CardTitle className="text-lg text-white sm:text-xl">Приглашённые пользователи</CardTitle>
        <p className="text-sm leading-6 text-zinc-400">Список регистраций по вашей ссылке и дата первого успешного платежа.</p>
      </CardHeader>

      <CardContent className="grid gap-4 p-5 pt-0 sm:p-6 sm:pt-0">
        {referredUsers.length === 0 ? (
          <SectionEmptyState
            title="Пока без приглашений"
            description="Поделитесь ссылкой, чтобы здесь появились новые регистрации."
          />
        ) : (
          <>
            <div className="grid gap-3 xl:hidden">
              {referredUsers.map((userItem) => {
                const firstPayment = userItem.payments[0]?.paidAt;
                const hasPayment = Boolean(firstPayment);

                return (
                  <article key={userItem.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium text-white">{maskEmail(userItem.email)}</p>
                        <p className="text-xs text-zinc-500">{hasPayment ? "Первый платёж зафиксирован" : "Ожидает первый платёж"}</p>
                      </div>
                      <span className="inline-flex h-8 items-center rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs text-zinc-300">
                        {hasPayment ? "Оплатил" : "Без оплаты"}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3">
                      <SummaryChip label="Регистрация" value={formatDateTime(userItem.createdAt)} />
                      <SummaryChip label="Первый платёж" value={formatDateTime(firstPayment)} />
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden xl:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Регистрация</TableHead>
                    <TableHead>Первый платёж</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referredUsers.map((userItem) => (
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
  );
}

function RewardsSection({ rewards }: Pick<ReferralSummaryBlocksProps, "rewards">) {
  return (
    <Card>
      <CardHeader className="space-y-2 p-5 pb-3 sm:p-6 sm:pb-4">
        <CardTitle className="text-lg text-white sm:text-xl">Награды</CardTitle>
        <p className="text-sm leading-6 text-zinc-400">Все начисления за первые успешные платежи приглашённых пользователей.</p>
      </CardHeader>

      <CardContent className="grid gap-4 p-5 pt-0 sm:p-6 sm:pt-0">
        {rewards.length === 0 ? (
          <SectionEmptyState
            title="Наград пока нет"
            description="После первого успешного платежа приглашённого пользователя награда появится здесь."
          />
        ) : (
          <>
            <div className="grid gap-3 xl:hidden">
              {rewards.map((reward) => (
                <article key={reward.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white">{maskEmail(reward.referredUser.email)}</p>
                    <p className="text-xs text-zinc-500">{formatDateTime(reward.createdAt)}</p>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <SummaryChip label="Тип" value={reward.rewardType} />
                    <SummaryChip label="Значение" value={String(reward.rewardValue)} />
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden xl:block">
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
                  {rewards.map((reward) => (
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
  );
}

export function ReferralSummaryBlocks(props: ReferralSummaryBlocksProps) {
  return (
    <div className="grid gap-4 sm:gap-5">
      <ReferralLinkCard {...props} />
      <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
        <InvitedUsersSection referredUsers={props.referredUsers} />
        <RewardsSection rewards={props.rewards} />
      </div>
    </div>
  );
}
