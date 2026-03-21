import { AsyncActionButton } from "@/components/admin/async-action-button";
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

  const canRefreshPayment = (payment: (typeof result.items)[number]) =>
    payment.status === "PENDING" || (payment.status === "SUCCEEDED" && !payment.subscriptionId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Платежи</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:hidden">
          {result.items.map((payment) => (
            <div key={payment.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white break-all">{payment.user.email}</p>
                  <p className="break-words text-sm text-zinc-400">{payment.plan.name}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Провайдер</p>
                    <p className="mt-2 text-sm text-white">{payment.provider}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Сумма</p>
                    <p className="mt-2 text-sm text-white">{formatPrice(payment.amount)}</p>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <PaymentStatusBadge status={payment.status} />
                  <p className="text-xs text-zinc-500">{formatDateTime(payment.paidAt ?? payment.createdAt)}</p>
                </div>
                {canRefreshPayment(payment) ? (
                  <AsyncActionButton
                    label="Проверить статус"
                    pendingLabel="Проверяем..."
                    endpoint={`/api/admin/payments/${payment.id}/refresh`}
                  />
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Тариф</TableHead>
                <TableHead>Провайдер</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="max-w-[220px] break-all">{payment.user.email}</TableCell>
                  <TableCell>{payment.plan.name}</TableCell>
                  <TableCell>{payment.provider}</TableCell>
                  <TableCell>{formatPrice(payment.amount)}</TableCell>
                  <TableCell>
                    <PaymentStatusBadge status={payment.status} />
                  </TableCell>
                  <TableCell>{formatDateTime(payment.paidAt ?? payment.createdAt)}</TableCell>
                  <TableCell>
                    {canRefreshPayment(payment) ? (
                      <AsyncActionButton
                        label="Проверить статус"
                        pendingLabel="Проверяем..."
                        endpoint={`/api/admin/payments/${payment.id}/refresh`}
                      />
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
