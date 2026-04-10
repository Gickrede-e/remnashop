"use client";

import { Check, Copy, Gift, Link as LinkIcon, Users } from "lucide-react";
import { useState } from "react";

import { DashboardCard } from "@/components/blocks/dashboard/dashboard-card";
import { DashboardStatTile } from "@/components/blocks/dashboard/dashboard-stat-tile";
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

export function ReferralSummaryBlocks({ referralLink, referredUsers, rewards }: ReferralSummaryBlocksProps) {
  const [copied, setCopied] = useState(false);
  const totalRewards = rewards.reduce((sum, reward) => sum + reward.rewardValue, 0);

  async function handleCopyReferralLink() {
    if (!referralLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="dashWorkspace dashReferrals">
      <div className="dashStatGrid">
        <DashboardStatTile icon={Users} label="Приглашено" value={String(referredUsers.length)} />
        <DashboardStatTile icon={Gift} label="Наград" value={String(rewards.length)} />
        <DashboardStatTile icon={LinkIcon} label="Сумма наград" value={String(totalRewards)} />
      </div>

      <div className="dashCardGrid">
        <DashboardCard title="Приглашённые пользователи" className="dashCardWide">
          {referredUsers.length === 0 ? (
            <p>Поделитесь ссылкой, чтобы здесь появились новые регистрации.</p>
          ) : (
            <table className="dashTable">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Дата регистрации</th>
                </tr>
              </thead>
              <tbody>
                {referredUsers.map((userItem) => (
                  <tr key={userItem.id}>
                    <td>{maskEmail(userItem.email)}</td>
                    <td>{formatDateTime(userItem.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DashboardCard>

        <DashboardCard
          title="Реферальная ссылка"
          className="dashCardNarrow"
          actions={
            <button
              type="button"
              aria-label={copied ? "Ссылка скопирована" : "Скопировать ссылку"}
              onClick={handleCopyReferralLink}
              disabled={!referralLink}
            >
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            </button>
          }
        >
          <code
            style={{
              display: "block",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              fontFamily: "var(--font-geist-mono, monospace)"
            }}
          >
            {referralLink || "Ссылка недоступна"}
          </code>
        </DashboardCard>
      </div>
    </div>
  );
}
