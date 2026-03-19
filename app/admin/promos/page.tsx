import Link from "next/link";

import { AsyncActionButton } from "@/components/admin/async-action-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listPromoCodes } from "@/lib/services/promos";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPromosPage() {
  const promos = await listPromoCodes();

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Промокоды</CardTitle>
          <p className="mt-1 text-sm text-zinc-400">Скидки, бонусные дни и трафик с привязкой к тарифам.</p>
        </div>
        <Link href="/admin/promos/new" className="rounded-2xl bg-gradient-to-r from-violet-500 to-blue-500 px-4 py-3 text-sm text-white">
          Создать промокод
        </Link>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Код</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Значение</TableHead>
              <TableHead>Использований</TableHead>
              <TableHead>Истекает</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {promos.map((promo) => (
              <TableRow key={promo.id}>
                <TableCell>{promo.code}</TableCell>
                <TableCell>{promo.type}</TableCell>
                <TableCell>{promo.value}</TableCell>
                <TableCell>
                  {promo.currentUsages}/{promo.maxUsages ?? "∞"}
                </TableCell>
                <TableCell>{formatDateTime(promo.expiresAt)}</TableCell>
                <TableCell>{promo.isActive ? "Активен" : "Отключен"}</TableCell>
                <TableCell className="flex gap-2">
                  <Link href={`/admin/promos/${promo.id}/edit`} className="rounded-2xl border border-white/10 px-3 py-2 text-sm text-white">
                    Редактировать
                  </Link>
                  {promo.isActive ? (
                    <AsyncActionButton
                      label="Отключить"
                      pendingLabel="..."
                      variant="destructive"
                      endpoint={`/api/admin/promos/${promo.id}`}
                      method="DELETE"
                    />
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
