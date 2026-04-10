import Link from "next/link";

import { AdminRecordCard, AdminRecordEmptyState, AdminRecordList } from "@/components/blocks/admin/admin-record-list";
import { ActiveUsersSyncButton } from "@/components/admin/active-users-sync-button";
import { AdminUserActions } from "@/components/admin/user-actions";
import { ScreenHeader } from "@/components/shell/screen-header";
import { SubscriptionStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAllPlans } from "@/lib/services/plans";
import { getAdminUsers } from "@/lib/services/stats";
import { formatDateTime, formatPrice } from "@/lib/utils";

type UsersPageProps = {
  searchParams?: Promise<{
    page?: string;
    search?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({ searchParams }: UsersPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const page = Number(resolvedSearchParams?.page ?? "1");
  const normalizedSearch = resolvedSearchParams?.search?.trim();
  const search = normalizedSearch ? normalizedSearch : undefined;
  const [result, plans] = await Promise.all([
    getAdminUsers({ page, limit: 20, search }),
    getAllPlans()
  ]);
  const planOptions = plans.map((plan) => ({ id: plan.id, name: plan.name }));

  return (
    <div className="adminWorkspacePage adminWorkspace adminSurfacePage">
      <ScreenHeader
        eyebrow="Админка"
        title="Пользователи"
        description="Поиск, управление доступом и ручная выдача подписок."
      />

      <AdminRecordList
        title="Список пользователей"
        description="Все зарегистрированные пользователи с возможностью управления доступом."
        controls={
          <div className="adminListControls">
            <form className="adminFilterForm adminFilterFormWide">
              <Input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Поиск по email"
                aria-label="Поиск пользователя по email"
              />
              <Button type="submit" variant="secondary" className="commandButton commandButtonSecondary">
                Найти
              </Button>
              <Button asChild variant="ghost" className="commandButton commandButtonSecondary">
                <Link href="/admin/users">Сбросить</Link>
              </Button>
            </form>
            <ActiveUsersSyncButton />
          </div>
        }
        summary={
          <div className="adminSummaryGrid adminSummaryGridWide">
            <SummaryItem label="Записей на странице" value={String(result.items.length)} />
            <SummaryItem label="Текущий поиск" value={search || "Все пользователи"} />
          </div>
        }
      >
        {result.items.length === 0 ? (
          <AdminRecordEmptyState
            title="Пользователи не найдены"
            description="Измените поисковый запрос или используйте кнопку сброса выше, чтобы увидеть больше записей."
          />
        ) : (
          <>
            <div className="adminResponsiveStack">
              {result.items.map((user) => (
                <AdminRecordCard
                  key={user.id}
                  title={user.email}
                  subtitle={`Регистрация ${formatDateTime(user.createdAt)}`}
                  badge={
                    user.subscription ? (
                      <SubscriptionStatusBadge status={user.subscription.status} />
                    ) : (
                      <span className="adminBadgePill">Без подписки</span>
                    )
                  }
                  metadata={[
                    { label: "Роль", value: user.role },
                    { label: "Подписка", value: user.subscription?.plan?.name ?? "—" },
                    { label: "Оплачено", value: formatPrice(user.totalSpent) }
                  ]}
                  actions={
                    <AdminUserActions
                      userId={user.id}
                      subscriptionId={user.subscription?.id}
                      currentlyEnabled={user.subscription?.status === "ACTIVE"}
                      plans={planOptions}
                      idPrefix="mobile-admin-user"
                    />
                  }
                />
              ))}
            </div>

            <div className="adminDesktopTable">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Подписка</TableHead>
                    <TableHead>Оплачено</TableHead>
                    <TableHead>Дата регистрации</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="adminCellWrap">{user.email}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>{user.subscription?.status ?? "—"}</TableCell>
                      <TableCell>{formatPrice(user.totalSpent)}</TableCell>
                      <TableCell>{formatDateTime(user.createdAt)}</TableCell>
                      <TableCell className="adminTableActionsCellWide">
                        <AdminUserActions
                          userId={user.id}
                          subscriptionId={user.subscription?.id}
                          currentlyEnabled={user.subscription?.status === "ACTIVE"}
                          plans={planOptions}
                          idPrefix="desktop-admin-user"
                        />
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
