import Link from "next/link";

import { AsyncActionButton } from "@/components/admin/async-action-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAllPlans } from "@/lib/services/plans";
import { formatPrice, slugToRemnawaveTag } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  const plans = await getAllPlans();

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Тарифы</CardTitle>
          <p className="mt-1 text-sm text-zinc-400">Конфигуратор тарифной сетки, Remnawave-сквадов и мягкого отключения планов.</p>
        </div>
        <Link
          href="/admin/plans/new"
          className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-gradient-to-r from-violet-500 to-blue-500 px-4 py-3 text-sm text-white"
        >
          Создать тариф
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:hidden">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-white">{plan.name}</p>
                  <p className="text-xs text-zinc-500">
                    {plan.slug} • {slugToRemnawaveTag(plan.slug)}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Цена</p>
                    <p className="mt-2 text-sm text-white">{formatPrice(plan.price)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Трафик и срок</p>
                    <p className="mt-2 text-sm text-white">
                      {plan.trafficGB} ГБ • {plan.durationDays} дней
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Сквады</p>
                    <p className="mt-2 text-sm text-white">
                      {plan.remnawaveInternalSquadUuids.length} вн. / {plan.remnawaveExternalSquadUuid ? "1 внеш." : "0 внеш."}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Статус</p>
                    <p className="mt-2 text-sm text-white">{plan.isActive ? "Активен" : "Отключен"}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link
                    href={`/admin/plans/${plan.id}/edit`}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm text-white"
                  >
                    Редактировать
                  </Link>
                  {plan.isActive ? (
                    <AsyncActionButton
                      label="Удалить"
                      pendingLabel="Удаляем..."
                      variant="destructive"
                      endpoint={`/api/admin/plans/${plan.id}`}
                      method="DELETE"
                      confirmMessage="Удалить тариф? Он останется в базе, но пропадёт из публичной продажи."
                    />
                  ) : (
                    <AsyncActionButton
                      label="Восстановить"
                      pendingLabel="..."
                      variant="secondary"
                      endpoint={`/api/admin/plans/${plan.id}`}
                      method="POST"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Цена</TableHead>
                <TableHead>Tag</TableHead>
                <TableHead>Трафик</TableHead>
                <TableHead>Длительность</TableHead>
                <TableHead>Сквады</TableHead>
                <TableHead>Устройства</TableHead>
                <TableHead>Метка</TableHead>
                <TableHead>Порядок</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <div className="font-medium text-white">{plan.name}</div>
                    <div className="text-xs text-zinc-500">{plan.slug}</div>
                  </TableCell>
                  <TableCell>{formatPrice(plan.price)}</TableCell>
                  <TableCell>{slugToRemnawaveTag(plan.slug)}</TableCell>
                  <TableCell>{plan.trafficGB} ГБ</TableCell>
                  <TableCell>{plan.durationDays} дней</TableCell>
                  <TableCell>
                    {plan.remnawaveInternalSquadUuids.length} вн. / {plan.remnawaveExternalSquadUuid ? "1 внеш." : "0 внеш."}
                  </TableCell>
                  <TableCell>{plan.remnawaveHwidDeviceLimit ?? "—"}</TableCell>
                  <TableCell>{plan.highlight ?? "—"}</TableCell>
                  <TableCell>{plan.sortOrder}</TableCell>
                  <TableCell>{plan.isActive ? "Активен" : "Отключен"}</TableCell>
                  <TableCell className="min-w-[240px]">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin/plans/${plan.id}/edit`} className="rounded-2xl border border-white/10 px-3 py-2 text-sm text-white">
                        Редактировать
                      </Link>
                      {plan.isActive ? (
                        <AsyncActionButton
                          label="Удалить"
                          pendingLabel="Удаляем..."
                          variant="destructive"
                          endpoint={`/api/admin/plans/${plan.id}`}
                          method="DELETE"
                          confirmMessage="Удалить тариф? Он останется в базе, но пропадёт из публичной продажи."
                        />
                      ) : (
                        <AsyncActionButton
                          label="Восстановить"
                          pendingLabel="..."
                          variant="secondary"
                          endpoint={`/api/admin/plans/${plan.id}`}
                          method="POST"
                        />
                      )}
                    </div>
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
