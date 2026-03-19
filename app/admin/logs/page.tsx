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
      <CardContent>
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
                <TableCell>{log.targetId}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
