import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle>Журнал действий</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:hidden">
          {result.items.map((log) => (
            <div key={log.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-medium text-white">{log.action}</p>
                  <p className="text-xs text-zinc-500">{formatDateTime(log.createdAt)}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Админ</p>
                    <p className="mt-2 text-sm text-white">{log.admin?.email ? maskEmail(log.admin.email) : "Система"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Сущность</p>
                    <p className="mt-2 text-sm text-white">{log.targetType}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Target ID</p>
                  <p className="mt-2 break-all text-sm text-white">{log.targetId}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block">
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
      </CardContent>
    </Card>
  );
}
