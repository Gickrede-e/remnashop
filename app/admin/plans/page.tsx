import Link from "next/link";

import { AsyncActionButton } from "@/components/admin/async-action-button";
import { AdminRecordCard, AdminRecordEmptyState, AdminRecordList } from "@/components/blocks/admin/admin-record-list";
import { ScreenHeader } from "@/components/shell/screen-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAllPlans } from "@/lib/services/plans";
import { formatPrice, slugToRemnawaveTag } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  const plans = await getAllPlans();
  const activePlans = plans.filter((plan) => plan.isActive).length;

  return (
    <div className="adminWorkspacePage adminWorkspace adminSurfacePage">
      <ScreenHeader
        eyebrow="Админка"
        title="Тарифы"
        description="Все тарифные планы и их текущие статусы."
        actions={
          <Button asChild className="commandButton commandButtonPrimary">
            <Link href="/admin/plans/new">Создать тариф</Link>
          </Button>
        }
      />

      <AdminRecordList
        title="Тарифная сетка"
        description="На телефоне показываем только данные, которые нужны, чтобы решить: открыть редактирование, отключить или восстановить тариф."
        summary={
          <div className="adminSummaryGrid">
            <SummaryItem label="Всего тарифов" value={String(plans.length)} />
            <SummaryItem label="Активных" value={String(activePlans)} />
            <SummaryItem label="Отключенных" value={String(plans.length - activePlans)} />
          </div>
        }
      >
        {plans.length === 0 ? (
          <AdminRecordEmptyState
            title="Тарифы ещё не созданы"
            description="Создайте первый тариф, чтобы он появился в списке и стал доступен для продажи."
          />
        ) : (
          <>
            <div className="adminResponsiveStack">
              {plans.map((plan) => (
                <AdminRecordCard
                  key={plan.id}
                  title={plan.name}
                  subtitle={`${plan.slug} • ${slugToRemnawaveTag(plan.slug)}`}
                  metadata={[
                    { label: "Цена", value: formatPrice(plan.price) },
                    { label: "Срок", value: `${plan.durationDays} дней` },
                    { label: "Трафик", value: `${plan.trafficGB} ГБ` },
                    { label: "Сквады", value: `${plan.remnawaveInternalSquadUuids.length} вн. / ${plan.remnawaveExternalSquadUuid ? "1 внеш." : "0 внеш."}` },
                    { label: "Статус", value: plan.isActive ? "Активен" : "Отключен" }
                  ]}
                  actions={
                    <div className="adminInlineActions">
                      <Button asChild variant="outline" className="commandButton commandButtonSecondary">
                        <Link href={`/admin/plans/${plan.id}/edit`}>Редактировать</Link>
                      </Button>
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
                          pendingLabel="Восстанавливаем..."
                          variant="secondary"
                          endpoint={`/api/admin/plans/${plan.id}`}
                          method="POST"
                        />
                      )}
                    </div>
                  }
                />
              ))}
            </div>

            <div className="adminDesktopTable">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Название</TableHead>
                    <TableHead>Цена</TableHead>
                    <TableHead>Срок</TableHead>
                    <TableHead>Трафик</TableHead>
                    <TableHead>Сквады</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <div className="adminTableTitle">{plan.name}</div>
                        <div className="adminTableMeta">
                          {plan.slug} • {slugToRemnawaveTag(plan.slug)}
                        </div>
                      </TableCell>
                      <TableCell>{formatPrice(plan.price)}</TableCell>
                      <TableCell>{plan.durationDays} дней</TableCell>
                      <TableCell>{plan.trafficGB} ГБ</TableCell>
                      <TableCell>
                        {plan.remnawaveInternalSquadUuids.length} вн. / {plan.remnawaveExternalSquadUuid ? "1 внеш." : "0 внеш."}
                      </TableCell>
                      <TableCell>{plan.isActive ? "Активен" : "Отключен"}</TableCell>
                      <TableCell className="adminTableActionsCell">
                        <div className="adminInlineActions">
                          <Button asChild size="sm" variant="outline" className="commandButton commandButtonSecondary">
                            <Link href={`/admin/plans/${plan.id}/edit`}>Редактировать</Link>
                          </Button>
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
                              pendingLabel="Восстанавливаем..."
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
