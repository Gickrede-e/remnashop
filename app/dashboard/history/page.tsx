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
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
