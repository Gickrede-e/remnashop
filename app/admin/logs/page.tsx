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
    <div className="adminWorkspacePage adminWorkspace adminSurfacePage">
      <ScreenHeader
        eyebrow="Админка"
        title="Логи"
        description="Последние действия администраторов и системные события."
      />

      <AdminRecordList
        title="Журнал действий"
        description="Последние 50 записей с действиями и их контекстом."
        summary={
          <div className="adminSummaryGrid adminSummaryGridWide">
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
            <div className="adminResponsiveStack">
              {result.items.map((log) => (
                <AdminRecordCard
                  key={log.id}
                  title={log.action}
                  subtitle={formatDateTime(log.createdAt)}
                  metadata={[
                    { label: "Админ", value: log.admin?.email ? maskEmail(log.admin.email) : "Система" },
                    { label: "Раздел", value: log.targetType },
                    { label: "Идентификатор", value: log.targetId }
                  ]}
                />
              ))}
            </div>

            <div className="adminDesktopTable">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Когда</TableHead>
                    <TableHead>Админ</TableHead>
                    <TableHead>Действие</TableHead>
                    <TableHead>Раздел</TableHead>
                    <TableHead>Идентификатор</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{formatDateTime(log.createdAt)}</TableCell>
                      <TableCell>{log.admin?.email ? maskEmail(log.admin.email) : "Система"}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{log.targetType}</TableCell>
                      <TableCell className="adminCellWrap">{log.targetId}</TableCell>
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
