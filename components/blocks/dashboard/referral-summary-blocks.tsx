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
    <div className="dataDetailPill">
      <p className="dataDetailLabel">{label}</p>
      <p className="dataDetailValue">{value}</p>
    </div>
  );
}

function SectionEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="dataEmptyState">
      <p className="dataEmptyStateTitle">{title}</p>
      <p className="dataEmptyStateDescription">{description}</p>
    </div>
  );
}

function ReferralLinkCard({ referralLink, referredUsers, rewards }: ReferralSummaryBlocksProps) {
  const successfulReferrals = referredUsers.filter((userItem) => userItem.payments.length > 0).length;

  return (
    <Card className="dashboardSection referralWorkspace dataPanel dataPanelFeature">
      <CardHeader className="dataPanelHeaderFeature">
        <div className="dataPanelCopy">
          <CardTitle className="dataPanelTitle">Реферальная ссылка</CardTitle>
          <p className="dataPanelDescription">
            Приглашайте друзей по своей ссылке и отслеживайте, кто уже зарегистрировался и какие награды были
            начислены.
          </p>
        </div>
      </CardHeader>

      <CardContent className="dataPanelBody">
        <div className="referralLinkPanel">
          <p className="dataDetailLabel">Ссылка для приглашений</p>
          <p className="referralLinkValue">{referralLink || "Ссылка недоступна"}</p>
        </div>

        <div className="dataSummaryGrid dataSummaryGridTertiary">
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
    <Card className="dataPanel">
      <CardHeader className="dataPanelHeaderCompact">
        <CardTitle className="dataPanelSectionTitle">Приглашённые пользователи</CardTitle>
        <p className="dataPanelDescription">
          Список регистраций по вашей ссылке и дата последнего успешного платежа.
        </p>
      </CardHeader>

      <CardContent className="dataPanelBody">
        {referredUsers.length === 0 ? (
          <SectionEmptyState
            title="Пока без приглашений"
            description="Поделитесь ссылкой, чтобы здесь появились новые регистрации."
          />
        ) : (
          <>
            <div className="dataResponsiveStack">
              {referredUsers.map((userItem) => {
                const firstPayment = userItem.payments[0]?.paidAt;
                const hasPayment = Boolean(firstPayment);

                return (
                  <article key={userItem.id} className="dataCard">
                    <div className="dataCardHeader">
                      <div className="dataCardCopy">
                        <p className="dataCardTitle">{maskEmail(userItem.email)}</p>
                        <p className="dataCardMeta">
                          {hasPayment ? "Последний платёж зафиксирован" : "Ожидает успешный платёж"}
                        </p>
                      </div>
                      <span className="statusBadge statusBadgePending">
                        {hasPayment ? "Оплатил" : "Без оплаты"}
                      </span>
                    </div>

                    <div className="dataCardDetails">
                      <SummaryChip label="Регистрация" value={formatDateTime(userItem.createdAt)} />
                      <SummaryChip label="Последний платёж" value={formatDateTime(firstPayment)} />
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="dataDesktopTable">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Регистрация</TableHead>
                    <TableHead>Последний платёж</TableHead>
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
    <Card className="dataPanel">
      <CardHeader className="dataPanelHeaderCompact">
        <CardTitle className="dataPanelSectionTitle">Награды</CardTitle>
        <p className="dataPanelDescription">
          Все начисления за первые успешные платежи приглашённых пользователей.
        </p>
      </CardHeader>

      <CardContent className="dataPanelBody">
        {rewards.length === 0 ? (
          <SectionEmptyState
            title="Наград пока нет"
            description="После первого успешного платежа приглашённого пользователя награда появится здесь."
          />
        ) : (
          <>
            <div className="dataResponsiveStack">
              {rewards.map((reward) => (
                <article key={reward.id} className="dataCard">
                  <div className="dataCardCopy">
                    <p className="dataCardTitle">{maskEmail(reward.referredUser.email)}</p>
                    <p className="dataCardMeta">{formatDateTime(reward.createdAt)}</p>
                  </div>

                  <div className="dataCardDetails">
                    <SummaryChip label="Тип" value={reward.rewardType} />
                    <SummaryChip label="Значение" value={String(reward.rewardValue)} />
                  </div>
                </article>
              ))}
            </div>

            <div className="dataDesktopTable">
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
    <div className="dashboardWorkspace referralWorkspace">
      <ReferralLinkCard {...props} />
      <div className="dataSplitGrid">
        <InvitedUsersSection referredUsers={props.referredUsers} />
        <RewardsSection rewards={props.rewards} />
      </div>
    </div>
  );
}
