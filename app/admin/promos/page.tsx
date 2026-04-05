import Link from "next/link";

import { AsyncActionButton } from "@/components/admin/async-action-button";
import { AdminRecordCard, AdminRecordEmptyState, AdminRecordList } from "@/components/blocks/admin/admin-record-list";
import { ScreenHeader } from "@/components/shell/screen-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listPromoCodes } from "@/lib/services/promos";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPromosPage() {
  const promos = await listPromoCodes();
  const activePromos = promos.filter((promo) => promo.isActive).length;

  return (
    <div className="grid gap-4 sm:gap-6">
      <ScreenHeader
        eyebrow="Админка"
        title="Промокоды"
        description="Управление промокодами и скидками."
        actions={
          <Button asChild>
            <Link href="/admin/promos/new">Создать промокод</Link>
          </Button>
        }
      />

      <AdminRecordList
        title="Каталог промокодов"
        description="В первом экране оставляем только тип, значение, лимиты и срок действия, чтобы быстрее понимать, что открывать или отключать."
        summary={
          <div className="surface-soft grid gap-3 p-4 sm:grid-cols-3">
            <SummaryItem label="Всего кодов" value={String(promos.length)} />
            <SummaryItem label="Активных" value={String(activePromos)} />
            <SummaryItem label="Отключенных" value={String(promos.length - activePromos)} />
          </div>
        }
      >
        {promos.length === 0 ? (
          <AdminRecordEmptyState
            title="Промокоды ещё не созданы"
            description="Создайте первый промокод, чтобы он появился в списке и стал доступен в checkout."
          />
        ) : (
          <>
            <div className="grid gap-3 xl:hidden">
              {promos.map((promo) => (
                <AdminRecordCard
                  key={promo.id}
                  title={promo.code}
                  subtitle={promo.type}
                  metadata={[
                    { label: "Значение", value: String(promo.value) },
                    { label: "Использований", value: `${promo.currentUsages}/${promo.maxUsages ?? "∞"}` },
                    { label: "Истекает", value: formatDateTime(promo.expiresAt) },
                    { label: "Статус", value: promo.isActive ? "Активен" : "Отключен" }
                  ]}
                  actions={
                    <div className="grid gap-2 sm:justify-items-end">
                      <Button asChild variant="outline" className="w-full sm:w-auto">
                        <Link href={`/admin/promos/${promo.id}/edit`}>Редактировать</Link>
                      </Button>
                      {promo.isActive ? (
                        <AsyncActionButton
                          label="Отключить"
                          pendingLabel="Отключаем..."
                          variant="destructive"
                          endpoint={`/api/admin/promos/${promo.id}`}
                          method="DELETE"
                        />
                      ) : null}
                    </div>
                  }
                />
              ))}
            </div>

            <div className="hidden xl:block">
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
                      <TableCell className="font-medium text-white">{promo.code}</TableCell>
                      <TableCell>{promo.type}</TableCell>
                      <TableCell>{promo.value}</TableCell>
                      <TableCell>
                        {promo.currentUsages}/{promo.maxUsages ?? "∞"}
                      </TableCell>
                      <TableCell>{formatDateTime(promo.expiresAt)}</TableCell>
                      <TableCell>{promo.isActive ? "Активен" : "Отключен"}</TableCell>
                      <TableCell className="min-w-[220px]">
                        <div className="flex flex-wrap gap-2">
                          <Button asChild variant="outline" className="h-9 px-3">
                            <Link href={`/admin/promos/${promo.id}/edit`}>Редактировать</Link>
                          </Button>
                          {promo.isActive ? (
                            <AsyncActionButton
                              label="Отключить"
                              pendingLabel="Отключаем..."
                              variant="destructive"
                              endpoint={`/api/admin/promos/${promo.id}`}
                              method="DELETE"
                              className="h-9"
                            />
                          ) : null}
                        </div>
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
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className="text-sm font-medium text-white">{value}</p>
    </div>
  );
}
