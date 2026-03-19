import Link from "next/link";

import { AsyncActionButton } from "@/components/admin/async-action-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAllPlans } from "@/lib/services/plans";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  const plans = await getAllPlans();

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Тарифы</CardTitle>
          <p className="mt-1 text-sm text-zinc-400">Конфигуратор тарифной сетки и мягкое отключение планов.</p>
        </div>
        <Link href="/admin/plans/new" className="rounded-2xl bg-gradient-to-r from-violet-500 to-blue-500 px-4 py-3 text-sm text-white">
          Создать тариф
        </Link>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Цена</TableHead>
              <TableHead>Трафик</TableHead>
              <TableHead>Длительность</TableHead>
              <TableHead>Метка</TableHead>
              <TableHead>Порядок</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell>{plan.name}</TableCell>
                <TableCell>{formatPrice(plan.price)}</TableCell>
                <TableCell>{plan.trafficGB} ГБ</TableCell>
                <TableCell>{plan.durationDays} дней</TableCell>
                <TableCell>{plan.highlight ?? "—"}</TableCell>
                <TableCell>{plan.sortOrder}</TableCell>
                <TableCell>{plan.isActive ? "Активен" : "Отключен"}</TableCell>
                <TableCell className="flex gap-2">
                  <Link href={`/admin/plans/${plan.id}/edit`} className="rounded-2xl border border-white/10 px-3 py-2 text-sm text-white">
                    Редактировать
                  </Link>
                  {plan.isActive ? (
                    <AsyncActionButton
                      label="Отключить"
                      pendingLabel="..."
                      variant="destructive"
                      endpoint={`/api/admin/plans/${plan.id}`}
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
