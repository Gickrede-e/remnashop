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
    <div className="adminWorkspacePage adminWorkspace adminSurfacePage">
      <ScreenHeader
        eyebrow="Админка"
        title="Промокоды"
        description="Управление промокодами и скидками."
        actions={
          <Button asChild className="commandButton commandButtonPrimary">
            <Link href="/admin/promos/new">Создать промокод</Link>
          </Button>
        }
      />

      <AdminRecordList
        title="Каталог промокодов"
        description="В первом экране оставляем только тип, значение, лимиты и срок действия, чтобы быстрее понимать, что открывать или отключать."
        summary={
          <div className="adminSummaryGrid">
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
            <div className="adminResponsiveStack">
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
                    <div className="adminInlineActions">
                      <Button asChild variant="outline" className="commandButton commandButtonSecondary">
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

            <div className="adminDesktopTable">
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
                      <TableCell className="adminTableTitle">{promo.code}</TableCell>
                      <TableCell>{promo.type}</TableCell>
                      <TableCell>{promo.value}</TableCell>
                      <TableCell>
                        {promo.currentUsages}/{promo.maxUsages ?? "∞"}
                      </TableCell>
                      <TableCell>{formatDateTime(promo.expiresAt)}</TableCell>
                      <TableCell>{promo.isActive ? "Активен" : "Отключен"}</TableCell>
                      <TableCell className="adminTableActionsCell">
                        <div className="adminInlineActions">
                          <Button asChild size="sm" variant="outline" className="commandButton commandButtonSecondary">
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
