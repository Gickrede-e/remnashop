"use client";

import { Check, Copy, Send, Share2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { DashboardCard } from "@/components/blocks/dashboard/dashboard-card";
import { Button } from "@/components/ui/button";
import { formatDayCount, maskEmail } from "@/lib/utils";

type ReferralRewardType = "FREE_DAYS" | "FREE_TRAFFIC_GB" | "DISCOUNT_PERCENT";

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
  applied: boolean;
  createdAt: Date;
  referredUser: {
    email: string;
  };
};

type ReferralSummaryBlocksProps = {
  referralLink: string;
  referredUsers: ReferredUserItem[];
  rewards: RewardItem[];
  friendReward: { type: ReferralRewardType; value: number };
};

const COPIED_FEEDBACK_MS = 1500;
const SHARE_TEXT = "Присоединяйся к GickShop по моей ссылке";

function formatReward(type: string, value: number) {
  if (type === "FREE_DAYS") {
    return `+${formatDayCount(value)}`;
  }

  if (type === "FREE_TRAFFIC_GB") {
    return `+${value} ГБ`;
  }

  return `−${value}%`;
}

function formatRewardDate(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(date);
}

// The Web Share API exists only in the browser, so the server render always starts without the button.
function subscribeToNothing() {
  return () => {};
}

function getCanShareNatively() {
  return typeof navigator.share === "function";
}

function getCannotShareOnServer() {
  return false;
}

export function ReferralSummaryBlocks({ referralLink, referredUsers, rewards, friendReward }: ReferralSummaryBlocksProps) {
  const [copied, setCopied] = useState(false);
  const canShareNatively = useSyncExternalStore(subscribeToNothing, getCanShareNatively, getCannotShareOnServer);

  const friendRewardLabel = formatReward(friendReward.type, friendReward.value);
  const paidReferredCount = referredUsers.filter((userItem) => userItem.payments.length > 0).length;
  const bonusDays = rewards
    .filter((reward) => reward.rewardType === "FREE_DAYS")
    .reduce((sum, reward) => sum + reward.rewardValue, 0);
  const bonusTrafficGb = rewards
    .filter((reward) => reward.rewardType === "FREE_TRAFFIC_GB")
    .reduce((sum, reward) => sum + reward.rewardValue, 0);
  const bonusStat =
    bonusDays > 0
      ? { value: `+${bonusDays}`, label: "дней начислено" }
      : bonusTrafficGb > 0
        ? { value: `+${bonusTrafficGb}`, label: "ГБ начислено" }
        : { value: "0", label: "начислено" };
  const hasWaitingRewards = rewards.some((reward) => !reward.applied);
  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(SHARE_TEXT)}`;
  const howItWorks = [
    { title: "Поделитесь ссылкой", text: "Отправьте её другу в любом мессенджере." },
    { title: "Друг регистрируется и оплачивает", text: "Засчитывается только его первая оплата." },
    { title: `Вы получаете ${friendRewardLabel}`, text: "Бонус начислится при вашей следующей оплате." }
  ];

  async function handleCopyReferralLink() {
    if (!referralLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      setCopied(false);
    }
  }

  async function handleShare() {
    try {
      await navigator.share({ title: "GickShop", text: SHARE_TEXT, url: referralLink });
    } catch (error) {
      // Closing the share sheet rejects with AbortError: that is the user's choice, not a failure.
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      await handleCopyReferralLink();
    }
  }

  return (
    <div className="dashWorkspace dashReferrals">
      <div className="dashCardGrid">
        <DashboardCard
          title="Ваша ссылка"
          className="dashCardWide"
          actions={<span className="badge badgeDefault">{`${friendRewardLabel} за друга`}</span>}
        >
          <div className="dashCopyField">
            <code className="dashCopyFieldValue">{referralLink || "Ссылка недоступна"}</code>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCopyReferralLink}
              disabled={!referralLink}
            >
              {copied ? (
                <>
                  <Check className="iconSm iconNoShrink" aria-hidden="true" />
                  Скопировано
                </>
              ) : (
                <>
                  <Copy className="iconSm iconNoShrink" aria-hidden="true" />
                  Копировать
                </>
              )}
            </Button>
          </div>
          {referralLink ? (
            <div className="referralShare">
              <a
                href={telegramShareUrl}
                target="_blank"
                rel="noreferrer"
                className="button buttonSecondary buttonSizeSm"
              >
                <Send className="iconSm iconNoShrink" aria-hidden="true" />
                Отправить в Telegram
              </a>
              {canShareNatively ? (
                <button type="button" className="button buttonSecondary buttonSizeSm" onClick={handleShare}>
                  <Share2 className="iconSm iconNoShrink" aria-hidden="true" />
                  Поделиться
                </button>
              ) : null}
            </div>
          ) : null}
          <p className="dashHint">Поделитесь ссылкой с другом. После его первой оплаты вам будет начислен бонус.</p>
          <div className="dashInlineStats">
            <span className="dashInlineStat">
              <strong className="dashInlineStatValue">{referredUsers.length}</strong>
              <span className="dashStatTileLabel">приглашено</span>
            </span>
            <span className="dashInlineStat">
              <strong className="dashInlineStatValue">{paidReferredCount}</strong>
              <span className="dashStatTileLabel">оплатили</span>
            </span>
            <span className="dashInlineStat">
              <strong className="dashInlineStatValue is-accent">{bonusStat.value}</strong>
              <span className="dashStatTileLabel">{bonusStat.label}</span>
            </span>
          </div>
        </DashboardCard>

        <DashboardCard title="Как это работает" className="dashCardNarrow">
          <ol className="referralSteps">
            {howItWorks.map((step, index) => (
              <li key={step.title} className="referralStep">
                <span className="referralStepNum" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="referralStepText">
                  <strong className="referralStepTitle">{step.title}</strong>
                  <span className="referralStepHint">{step.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </DashboardCard>
      </div>

      <div className="dashCardGrid">
        <DashboardCard title="Бонусы" className="dashCardWide">
          {rewards.length === 0 ? (
            <p>Бонусы появятся после первой оплаты приглашённого друга.</p>
          ) : (
            <>
              <ul className="referralRewards">
                {rewards.map((reward) => (
                  <li key={reward.id} className="referralReward">
                    <span className="referralRewardWho">
                      <span className="referralRewardEmail">{maskEmail(reward.referredUser.email)}</span>
                      <span className="referralRewardDate">Первая оплата {formatRewardDate(reward.createdAt)}</span>
                    </span>
                    <span className="referralRewardValue">{formatReward(reward.rewardType, reward.rewardValue)}</span>
                    <span className={`dashStatusPill is-${reward.applied ? "completed" : "pending"}`}>
                      {reward.applied ? "Начислено" : "Ожидает"}
                    </span>
                  </li>
                ))}
              </ul>
              {hasWaitingRewards ? (
                <p className="dashHint">Ожидающие бонусы начисляются при вашей следующей оплате.</p>
              ) : null}
            </>
          )}
        </DashboardCard>

        <DashboardCard title="Приглашённые" className="dashCardNarrow">
          {referredUsers.length === 0 ? (
            <p>Поделитесь ссылкой, чтобы здесь появились новые регистрации.</p>
          ) : (
            <ul className="dashList">
              {referredUsers.map((userItem) => {
                const hasPaid = userItem.payments.length > 0;
                return (
                  <li key={userItem.id} className="dashListItem">
                    <span>{maskEmail(userItem.email)}</span>
                    <span className={`dashStatusPill is-${hasPaid ? "completed" : "process"}`}>
                      {hasPaid ? "Оплатил" : "Ждём оплату"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </DashboardCard>
      </div>
    </div>
  );
}
