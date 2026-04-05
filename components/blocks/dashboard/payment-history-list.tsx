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
    <div className="surface-soft grid gap-3 p-4 sm:grid-cols-2">
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
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className="text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function PaymentHistoryEmptyState() {
  return (
    <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-zinc-300">
      <p className="font-medium text-white">Платежей пока нет</p>
      <p className="mt-2 leading-6 text-zinc-400">После первой оплаты здесь появится история операций по тарифам и промокодам.</p>
    </div>
  );
}

function PaymentHistoryCard({ payment }: { payment: PaymentHistoryItem }) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-white">{payment.plan.name}</p>
          <p className="text-xs text-zinc-400">{formatDateTime(payment.paidAt ?? payment.createdAt)}</p>
        </div>
        <PaymentStatusBadge status={payment.status} />
      </div>

      <div className="mt-4 grid gap-3">
        <DetailItem label="Сумма" value={formatPrice(payment.amount)} />
        <DetailItem label="Промокод" value={payment.promoCode?.code ?? "—"} />
      </div>
    </article>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className="mt-2 break-words text-sm text-white">{value}</p>
    </div>
  );
}

export function PaymentHistoryList({ payments }: PaymentHistoryListProps) {
  return (
    <Card className="surface-feature">
      <CardHeader className="space-y-4 p-5 sm:p-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(260px,0.7fr)] xl:items-end">
          <div className="space-y-2">
            <CardTitle className="text-xl text-white sm:text-2xl">История операций</CardTitle>
            <p className="max-w-2xl text-sm leading-6 text-zinc-300">
              Все платежи по тарифам собраны в одном месте. На телефоне список идёт карточками, на широком экране
              включается табличный режим.
            </p>
          </div>
          <PaymentHistorySummary payments={payments} />
        </div>
      </CardHeader>

      <CardContent className="grid gap-4 p-5 pt-0 sm:p-6 sm:pt-0">
        {payments.length === 0 ? (
          <PaymentHistoryEmptyState />
        ) : (
          <>
            <div className="grid gap-3 xl:hidden">
              {payments.map((payment) => (
                <PaymentHistoryCard key={payment.id} payment={payment} />
              ))}
            </div>

            <div className="hidden xl:block">
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
