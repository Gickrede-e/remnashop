import type { ComponentProps } from "react";

import { PaymentStatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatPrice } from "@/lib/utils";

type PaymentStatus = ComponentProps<typeof PaymentStatusBadge>["status"];

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

function PaymentHistorySummary({ payments }: PaymentHistoryListProps) {
  return (
    <div className="dataSummaryGrid">
      <SummaryItem label="Операций" value={String(payments.length)} />
      <SummaryItem
        label="Последнее обновление"
        value={payments[0] ? formatDateTime(payments[0].paidAt ?? payments[0].createdAt) : "—"}
      />
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="dataSummaryItem">
      <p className="dataSummaryLabel">{label}</p>
      <p className="dataSummaryValue">{value}</p>
    </div>
  );
}

function PaymentHistoryEmptyState() {
  return (
    <div className="dataEmptyState">
      <p className="dataEmptyStateTitle">Платежей пока нет</p>
      <p className="dataEmptyStateDescription">
        После первой оплаты здесь появится история операций по тарифам и промокодам.
      </p>
    </div>
  );
}

function PaymentHistoryCard({ payment }: { payment: PaymentHistoryItem }) {
  return (
    <article className="dataCard">
      <div className="dataCardHeader">
        <div className="dataCardCopy">
          <p className="dataCardTitle">{payment.plan.name}</p>
          <p className="dataCardMeta">{formatDateTime(payment.paidAt ?? payment.createdAt)}</p>
        </div>
        <PaymentStatusBadge status={payment.status} />
      </div>

      <div className="dataCardDetails">
        <DetailItem label="Сумма" value={formatPrice(payment.amount)} />
        <DetailItem label="Промокод" value={payment.promoCode?.code ?? "—"} />
      </div>
    </article>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="dataDetailPill">
      <p className="dataDetailLabel">{label}</p>
      <p className="dataDetailValue">{value}</p>
    </div>
  );
}

export function PaymentHistoryList({ payments }: PaymentHistoryListProps) {
  return (
    <Card className="dashboardWorkspace dashboardSection historyWorkspace dataPanel dataPanelFeature">
      <CardHeader className="dataPanelHeaderFeature">
        <div className="dataPanelHeader">
          <div className="dataPanelCopy">
            <CardTitle className="dataPanelTitle">История операций</CardTitle>
            <p className="dataPanelDescription">
              Все платежи по тарифам собраны в одном месте. На телефоне список идёт карточками, на широком экране
              включается табличный режим.
            </p>
          </div>
          <PaymentHistorySummary payments={payments} />
        </div>
      </CardHeader>

      <CardContent className="dataPanelBody">
        {payments.length === 0 ? (
          <PaymentHistoryEmptyState />
        ) : (
          <>
            <div className="dataResponsiveStack">
              {payments.map((payment) => (
                <PaymentHistoryCard key={payment.id} payment={payment} />
              ))}
            </div>

            <div className="dataDesktopTable">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Тариф</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Промокод</TableHead>
                    <TableHead>Дата</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.plan.name}</TableCell>
                      <TableCell>{formatPrice(payment.amount)}</TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={payment.status} />
                      </TableCell>
                      <TableCell>{payment.promoCode?.code ?? "—"}</TableCell>
                      <TableCell>{formatDateTime(payment.paidAt ?? payment.createdAt)}</TableCell>
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
