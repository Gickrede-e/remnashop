import Link from "next/link";
import { PaymentProvider, PaymentStatus } from "@prisma/client";

import { AdminRecordCard, AdminRecordEmptyState, AdminRecordList } from "@/components/blocks/admin/admin-record-list";
import { AsyncActionButton } from "@/components/admin/async-action-button";
import { ScreenHeader } from "@/components/shell/screen-header";
import { Button } from "@/components/ui/button";
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
  const page = Number(resolvedSearchParams?.page ?? "1");
  const status = resolvedSearchParams?.status;
  const provider = resolvedSearchParams?.provider;
  const result = await getAdminPayments({
    page,
    limit: 20,
    status,
    provider
  });

  const canRefreshPayment = (payment: (typeof result.items)[number]) =>
    payment.status === "PENDING" || (payment.status === "SUCCEEDED" && !payment.subscriptionId);

  return (
    <div className="adminWorkspacePage adminWorkspace adminSurfacePage">
      <ScreenHeader
        eyebrow="Админка"
        title="Платежи"
        description="Список транзакций с фильтрами и проверкой незавершённых операций."
      />

      <AdminRecordList
        title="Платёжные операции"
        description="Все платежи с фильтрацией по статусу и платёжной системе."
        controls={
          <form className="adminFilterForm adminFilterFormWide">
            <select
              name="status"
              defaultValue={status ?? ""}
              aria-label="Фильтр по статусу платежа"
              className="controlSurface controlSelect"
            >
              <option value="">Все статусы</option>
              {Object.values(PaymentStatus).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select
              name="provider"
              defaultValue={provider ?? ""}
              aria-label="Фильтр по провайдеру платежа"
              className="controlSurface controlSelect"
            >
              <option value="">Все провайдеры</option>
              {Object.values(PaymentProvider).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <Button type="submit" variant="secondary" className="commandButton commandButtonSecondary">
              Фильтр
            </Button>
            <Button asChild variant="ghost" className="commandButton commandButtonSecondary">
              <Link href="/admin/payments">Сбросить</Link>
            </Button>
          </form>
        }
        summary={
          <div className="adminSummaryGrid">
            <SummaryItem label="На странице" value={String(result.items.length)} />
            <SummaryItem label="Статус" value={status || "Все"} />
            <SummaryItem label="Провайдер" value={provider || "Все"} />
          </div>
        }
      >
        {result.items.length === 0 ? (
          <AdminRecordEmptyState
            title="Платежи не найдены"
            description="Измените фильтры или сбросьте их, чтобы вернуться ко всем транзакциям."
          />
        ) : (
          <>
            <div className="adminResponsiveStack">
              {result.items.map((payment) => (
                <AdminRecordCard
                  key={payment.id}
                  title={payment.user.email}
                  subtitle={payment.plan.name}
                  badge={<PaymentStatusBadge status={payment.status} />}
                  metadata={[
                    { label: "Провайдер", value: payment.provider },
                    { label: "Сумма", value: formatPrice(payment.amount) },
                    { label: "Дата", value: formatDateTime(payment.paidAt ?? payment.createdAt) }
                  ]}
                  actions={
                    canRefreshPayment(payment) ? (
                      <AsyncActionButton
                        label="Проверить статус"
                        pendingLabel="Проверяем..."
                        endpoint={`/api/admin/payments/${payment.id}/refresh`}
                      />
                    ) : undefined
                  }
                />
              ))}
            </div>

            <div className="adminDesktopTable">
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
                      <TableCell className="adminCellWrap">{payment.user.email}</TableCell>
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
          </>
        )}
      </AdminRecordList>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="adminSummaryItem">
      <p className="adminSummaryLabel">{label}</p>
      <p className="adminSummaryValue">{value}</p>
    </div>
  );
}
