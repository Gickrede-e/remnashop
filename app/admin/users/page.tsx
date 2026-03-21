import Link from "next/link";

import { AdminRecordCard, AdminRecordEmptyState, AdminRecordList } from "@/components/blocks/admin/admin-record-list";
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
    <div className="grid gap-4 sm:gap-6">
      <ScreenHeader
        eyebrow="Админка"
        title="Пользователи"
        description="Поиск, синхронизация и ручное управление доступом в mobile-first списке."
      />

      <AdminRecordList
        title="Список пользователей"
        description="Карточки на телефоне и таблица на широких экранах используют одни и те же данные и действия."
        controls={
          <form className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <Input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Поиск по email"
              aria-label="Поиск пользователя по email"
            />
            <Button type="submit" variant="secondary">
              Найти
            </Button>
            <Button asChild variant="ghost">
              <Link href="/admin/users">Сбросить</Link>
            </Button>
          </form>
        }
        summary={
          <div className="surface-soft grid gap-3 p-4 sm:grid-cols-2">
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
            <div className="grid gap-3 xl:hidden">
              {result.items.map((user) => (
                <AdminRecordCard
                  key={user.id}
                  title={user.email}
                  subtitle={`Регистрация ${formatDateTime(user.createdAt)}`}
                  badge={
                    user.subscription ? (
                      <SubscriptionStatusBadge status={user.subscription.status} />
                    ) : (
                      <span className="inline-flex h-8 items-center rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs text-zinc-300">
                        Без подписки
                      </span>
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

            <div className="hidden xl:block">
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
                      <TableCell className="max-w-[240px] break-all">{user.email}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>{user.subscription?.status ?? "—"}</TableCell>
                      <TableCell>{formatPrice(user.totalSpent)}</TableCell>
                      <TableCell>{formatDateTime(user.createdAt)}</TableCell>
                      <TableCell className="min-w-[300px]">
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
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="text-sm font-medium text-white">{value}</p>
    </div>
  );
}
