import { subDays, startOfDay, startOfMonth } from "date-fns";

import { prisma } from "@/lib/prisma";

type CountRow = {
  count: bigint;
};

type RevenueChartRow = {
  date: string;
  amount: bigint;
};

export async function getAdminStats() {
  const now = new Date();
  const today = startOfDay(now);
  const monthStart = startOfMonth(now);
  const weekStart = subDays(today, 6);

  const [
    usersTotal,
    activeSubscriptions,
    revenueToday,
    revenueWeek,
    revenueMonth,
    revenueTotal,
    buyerRows
  ] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.count({
      where: { status: "ACTIVE" }
    }),
    prisma.payment.aggregate({
      where: {
        status: "SUCCEEDED",
        paidAt: { gte: today }
      },
      _sum: { amount: true }
    }),
    prisma.payment.aggregate({
      where: {
        status: "SUCCEEDED",
        paidAt: { gte: weekStart }
      },
      _sum: { amount: true }
    }),
    prisma.payment.aggregate({
      where: {
        status: "SUCCEEDED",
        paidAt: { gte: monthStart }
      },
      _sum: { amount: true }
    }),
    prisma.payment.aggregate({
      where: { status: "SUCCEEDED" },
      _sum: { amount: true }
    }),
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(DISTINCT "userId")::bigint AS count
      FROM "payments"
      WHERE status = 'SUCCEEDED'
    `
  ]);

  const todayRevenue = revenueToday._sum.amount ?? 0;
  const weekRevenue = revenueWeek._sum.amount ?? 0;
  const monthRevenue = revenueMonth._sum.amount ?? 0;
  const totalRevenue = revenueTotal._sum.amount ?? 0;
  const buyersCount = Number(buyerRows[0]?.count ?? 0n);
  const conversion = usersTotal ? Number(((buyersCount / usersTotal) * 100).toFixed(1)) : 0;

  return {
    revenueToday: todayRevenue,
    revenueWeek: weekRevenue,
    revenueMonth: monthRevenue,
    revenueTotal: totalRevenue,
    activeSubscriptions,
    totalUsers: usersTotal,
    conversion,
    revenue: {
      today: todayRevenue,
      week: weekRevenue,
      month: monthRevenue,
      total: totalRevenue
    },
    conversionRate: conversion
  };
}

export async function getRevenueChartData() {
  const end = startOfDay(new Date());
  const start = subDays(end, 29);
  const rows = await prisma.$queryRaw<RevenueChartRow[]>`
    WITH days AS (
      SELECT generate_series(${start}::date, ${end}::date, interval '1 day')::date AS day
    ),
    revenue AS (
      SELECT date_trunc('day', "paidAt")::date AS day, SUM(amount)::bigint AS amount
      FROM "payments"
      WHERE status = 'SUCCEEDED'
        AND "paidAt" >= ${start}
      GROUP BY 1
    )
    SELECT
      to_char(days.day, 'YYYY-MM-DD') AS date,
      COALESCE(revenue.amount, 0)::bigint AS amount
    FROM days
    LEFT JOIN revenue USING (day)
    ORDER BY days.day ASC
  `;

  return rows.map((row) => {
    const amount = Number(row.amount ?? 0n);
    return {
      date: row.date,
      revenue: amount / 100,
      amount
    };
  });
}

function mapUsersWithTotals<
  TUser extends {
    id: string;
  }
>(users: TUser[], totals: Array<{ userId: string; _sum: { amount: number | null } }>) {
  const totalSpentByUserId = new Map(
    totals.map((entry) => [entry.userId, entry._sum.amount ?? 0])
  );

  return users.map((user) => ({
    ...user,
    totalSpent: totalSpentByUserId.get(user.id) ?? 0
  }));
}

export async function getAdminUsers(input: {
  page: number;
  limit: number;
  search?: string;
}) {
  const where = input.search
    ? {
        OR: [
          { email: { contains: input.search, mode: "insensitive" as const } },
          { remnawaveUsername: { contains: input.search, mode: "insensitive" as const } }
        ]
      }
    : undefined;

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        subscription: {
          include: { plan: true }
        },
        payments: {
          where: { status: "SUCCEEDED" },
          orderBy: { createdAt: "desc" },
          take: 3
        }
      },
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.limit,
      take: input.limit
    }),
    prisma.user.count({ where })
  ]);

  const totals =
    items.length === 0
      ? []
      : await prisma.payment.groupBy({
          by: ["userId"],
          where: {
            userId: { in: items.map((user) => user.id) },
            status: "SUCCEEDED"
          },
          _sum: { amount: true }
        });

  return {
    items: mapUsersWithTotals(items, totals),
    total
  };
}

export async function getAdminPayments(input: {
  page: number;
  limit: number;
  status?: string;
  provider?: string;
}) {
  const where = {
    ...(input.status ? { status: input.status as never } : {}),
    ...(input.provider ? { provider: input.provider as never } : {})
  };

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        user: {
          select: { email: true }
        },
        plan: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.limit,
      take: input.limit
    }),
    prisma.payment.count({ where })
  ]);

  return { items, total };
}

export async function getRevenueChart() {
  const data = await getRevenueChartData();
  return data.map((item) => ({
    date: item.date,
    amount: item.amount
  }));
}
