import { CalendarClock, CreditCard, Wallet } from "lucide-react";

import { DashboardCard } from "@/components/blocks/dashboard/dashboard-card";
import { DashboardStatTile } from "@/components/blocks/dashboard/dashboard-stat-tile";
import { PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { formatDateTime, formatPrice } from "@/lib/utils";

type PaymentStatus = keyof typeof PAYMENT_STATUS_LABELS;

type PaymentHistoryItem = {
  id: string;
  amount: number;
  status: PaymentStatus;
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

export function PaymentHistoryList({ payments }: PaymentHistoryListProps) {
  const successfulPayments = payments.filter((payment) => payment.status === "SUCCEEDED");
  const lastPayment = payments[0];
  const totalSpent = successfulPayments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="dashWorkspace dashHistory">
      <div className="dashStatGrid">
        <DashboardStatTile icon={CreditCard} label="Платежей" value={String(payments.length)} />
        <DashboardStatTile
          icon={CalendarClock}
          label="Последний платёж"
          value={lastPayment ? formatDateTime(lastPayment.paidAt ?? lastPayment.createdAt) : "—"}
        />
        <DashboardStatTile
          icon={Wallet}
          label="Потрачено"
          value={successfulPayments.length > 0 ? formatPrice(totalSpent) : "—"}
        />
      </div>

      <DashboardCard title="История платежей">
        {payments.length === 0 ? (
          <p>Платежей пока нет. После первой оплаты здесь появится история операций по тарифам.</p>
        ) : (
          <table className="dashTable">
            <thead>
              <tr>
                <th>Дата</th>
                <th>План</th>
                <th>Сумма</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{formatDateTime(payment.paidAt ?? payment.createdAt)}</td>
                  <td>{payment.plan.name}</td>
                  <td>{formatPrice(payment.amount)}</td>
                  <td>
                    <PaymentHistoryStatusPill status={payment.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DashboardCard>
    </div>
  );
}
