import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaymentStatusBadge } from "@/components/shared/status-badge";
import { getAdminPayments } from "@/lib/services/stats";
import { formatDateTime, formatPrice } from "@/lib/utils";

type PaymentsPageProps = {
  searchParams?: Promise<{
    page?: string;
    status?: string;
    provider?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage({ searchParams }: PaymentsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const result = await getAdminPayments({
    page: Number(resolvedSearchParams?.page ?? "1"),
    limit: 20,
    status: resolvedSearchParams?.status,
    provider: resolvedSearchParams?.provider
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Платежи</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Тариф</TableHead>
              <TableHead>Провайдер</TableHead>
              <TableHead>Сумма</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Дата</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{payment.user.email}</TableCell>
                <TableCell>{payment.plan.name}</TableCell>
                <TableCell>{payment.provider}</TableCell>
                <TableCell>{formatPrice(payment.amount)}</TableCell>
                <TableCell>
                  <PaymentStatusBadge status={payment.status} />
                </TableCell>
                <TableCell>{formatDateTime(payment.paidAt ?? payment.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
