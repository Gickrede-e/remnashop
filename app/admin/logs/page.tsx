import { AdminRecordCard, AdminRecordEmptyState, AdminRecordList } from "@/components/blocks/admin/admin-record-list";
import { ScreenHeader } from "@/components/shell/screen-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminLogs } from "@/lib/services/admin-logs";
import { formatDateTime, maskEmail } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminLogsPage() {
  const result = await getAdminLogs({
    page: 1,
    limit: 50
  });

  return (
    <div className="grid gap-4 sm:gap-6">
      <ScreenHeader
        eyebrow="Админка"
        title="Логи"
        description="Последние действия админов и системные записи в компактном mobile-first журнале."
      />

      <AdminRecordList
        title="Журнал действий"
        description="Показываем последние 50 записей с ключевым контекстом, а полную таблицу оставляем только для широких экранов."
        summary={
          <div className="surface-soft grid gap-3 p-4 sm:grid-cols-2">
            <SummaryItem label="Всего записей" value={String(result.total)} />
            <SummaryItem label="Период" value="Последние события" />
          </div>
        }
      >
        {result.items.length === 0 ? (
          <AdminRecordEmptyState
            title="Логи пусты"
            description="Когда админы начнут выполнять действия, записи появятся здесь."
          />
        ) : (
          <>
            <div className="grid gap-3 xl:hidden">
              {result.items.map((log) => (
                <AdminRecordCard
                  key={log.id}
                  title={log.action}
                  subtitle={formatDateTime(log.createdAt)}
                  metadata={[
                    { label: "Админ", value: log.admin?.email ? maskEmail(log.admin.email) : "Система" },
                    { label: "Сущность", value: log.targetType },
                    { label: "Target ID", value: log.targetId }
                  ]}
                />
              ))}
            </div>

            <div className="hidden xl:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Когда</TableHead>
                    <TableHead>Админ</TableHead>
                    <TableHead>Действие</TableHead>
                    <TableHead>Сущность</TableHead>
                    <TableHead>Target ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{formatDateTime(log.createdAt)}</TableCell>
                      <TableCell>{log.admin?.email ? maskEmail(log.admin.email) : "Система"}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{log.targetType}</TableCell>
                      <TableCell className="max-w-[220px] break-all">{log.targetId}</TableCell>
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
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="text-sm font-medium text-white">{value}</p>
    </div>
  );
}
