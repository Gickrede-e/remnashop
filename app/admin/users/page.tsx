import { AdminUserActions } from "@/components/admin/user-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const search = resolvedSearchParams?.search;
  const [result, plans] = await Promise.all([
    getAdminUsers({ page, limit: 20, search }),
    getAllPlans()
  ]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Пользователи</CardTitle>
          <p className="mt-1 text-sm text-zinc-400">Поиск, синхронизация и ручное управление доступом.</p>
        </div>
        <form className="flex gap-2">
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Поиск по email"
            className="h-11 rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white"
          />
          <button className="rounded-2xl bg-white/10 px-4 text-sm text-white">Найти</button>
        </form>
      </CardHeader>
      <CardContent>
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
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>{user.subscription?.status ?? "—"}</TableCell>
                <TableCell>{formatPrice(user.payments.reduce((sum, payment) => sum + payment.amount, 0))}</TableCell>
                <TableCell>{formatDateTime(user.createdAt)}</TableCell>
                <TableCell className="min-w-[340px]">
                  <AdminUserActions
                    userId={user.id}
                    subscriptionId={user.subscription?.id}
                    currentlyEnabled={user.subscription?.status === "ACTIVE"}
                    plans={plans.map((plan) => ({ id: plan.id, name: plan.name }))}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
