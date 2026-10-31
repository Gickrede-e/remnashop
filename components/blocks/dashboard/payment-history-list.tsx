import { ArrowRight } from "lucide-react";

import { DashboardCard } from "@/components/blocks/dashboard/dashboard-card";
import { PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { calculateDurationPricing, normalizePaymentMonths } from "@/lib/payments/pricing";
import { formatDateTime, formatPrice, pluralize } from "@/lib/utils";

type PaymentStatus = keyof typeof PAYMENT_STATUS_LABELS;

type PaymentHistoryItem = {
  id: string;
  amount: number;
  originalAmount: number | null;
  months: number;
  status: PaymentStatus;
  confirmationUrl: string | null;
  createdAt: Date;
  paidAt: Date | null;
  plan: {
    name: string;
  };
  promoCode: {
    code: string;
  } | null;
};

type PaymentHistoryListProps = {
  payments: PaymentHistoryItem[];
};

function getPaymentStatusTone(status: PaymentStatus) {
  if (status === "SUCCEEDED") {
    return "completed";
  }

  if (status === "PENDING") {
    return "pending";
  }

  if (status === "FAILED" || status === "CANCELED") {
    return "failed";
  }

  return "process";
}

function PaymentHistoryStatusPill({ status }: { status: PaymentStatus }) {
  return <span className={`dashStatusPill is-${getPaymentStatusTone(status)}`}>{PAYMENT_STATUS_LABELS[status]}</span>;
}

/** Компактный «номер» платежа для UI — детерминированно из реального id, без выдуманных данных. */
function formatPaymentNumber(id: string) {
  return `GS-${id.slice(-6).toUpperCase()}`;
}

function formatMonths(months: number) {
  return `${months} ${pluralize(months, ["месяц", "месяца", "месяцев"])}`;
}

// originalAmount is the plan price × months before any discount; the promo code applies after
// the period discount, so what it saved is the period-discounted price minus the amount paid.
function getPromoSavings(payment: PaymentHistoryItem) {
  if (!payment.promoCode || !payment.originalAmount) {
    return 0;
  }

  const months = normalizePaymentMonths(payment.months);
  const { subtotalAmount } = calculateDurationPricing(payment.originalAmount / months, months);
  return Math.max(0, subtotalAmount - payment.amount);
}

export function PaymentHistoryList({ payments }: PaymentHistoryListProps) {
  const successfulPayments = payments.filter((payment) => payment.status === "SUCCEEDED");
  const totalSpent = successfulPayments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="dashWorkspace dashHistory">
      <DashboardCard
        title="История платежей"
        actions={
          successfulPayments.length > 0 ? (
            <span className="badge badgeMuted">{`за всё время — ${formatPrice(totalSpent)}`}</span>
          ) : undefined
        }
      >
        {payments.length === 0 ? (
          <p>Платежей пока нет. После первой оплаты здесь появится история операций по тарифам.</p>
        ) : (
          <div className="tableWrap">
            <table className="dashTable historyTable">
              <thead>
                <tr>
                  <th>Номер</th>
                  <th>Дата</th>
                  <th>Покупка</th>
                  <th className="historyAmountHead">Сумма</th>
                  <th>Статус</th>
                  <th>
                    <span className="srOnly">Действие</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => {
                  const promoSavings = getPromoSavings(payment);

                  return (
                    <tr key={payment.id}>
                      <td className="historyNumber">
                        <strong className="dashTableTitle" title={payment.id}>
                          {formatPaymentNumber(payment.id)}
                        </strong>
                      </td>
                      <td className="historyDate">{formatDateTime(payment.paidAt ?? payment.createdAt)}</td>
                      <td className="historyPurchase">
                        <span className="historyPurchaseTitle">
                          {payment.plan.name} · {formatMonths(payment.months)}
                        </span>
                        {payment.promoCode ? (
                          <span className="historyPromo">
                            Промокод {payment.promoCode.code}
                            {promoSavings > 0 ? ` · сэкономлено ${formatPrice(promoSavings)}` : ""}
                          </span>
                        ) : null}
                      </td>
                      <td className="historyAmount">{formatPrice(payment.amount)}</td>
                      <td className="historyStatus">
                        <PaymentHistoryStatusPill status={payment.status} />
                      </td>
                      <td className="historyAction">
                        {payment.status === "PENDING" && payment.confirmationUrl ? (
                          <a href={payment.confirmationUrl} className="button buttonPrimary buttonSizeSm">
                            Завершить оплату
                            <ArrowRight className="iconSm iconNoShrink" aria-hidden="true" />
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DashboardCard>
    </div>
  );
}
