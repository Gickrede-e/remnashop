import { redirect } from "next/navigation";

import { EmptyState } from "@/components/shared/empty-state";
import { PaymentStatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardHistoryPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const payments = await prisma.payment.findMany({
    where: {
      userId: session.userId
    },
    include: {
      plan: true,
      promoCode: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (payments.length === 0) {
    return <EmptyState title="Платежей пока нет" description="После первой оплаты здесь появится полная история операций." />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>История платежей</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:hidden">
          {payments.map((payment) => (
            <div key={payment.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-white">{payment.plan.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">{formatDateTime(payment.paidAt ?? payment.createdAt)}</p>
                  </div>
                  <PaymentStatusBadge status={payment.status} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Сумма</p>
                    <p className="mt-2 text-sm text-white">{formatPrice(payment.amount)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Промокод</p>
                    <p className="mt-2 text-sm text-white">{payment.promoCode?.code ?? "—"}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block">
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
      </CardContent>
    </Card>
  );
}
