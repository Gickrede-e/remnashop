import { subDays, startOfDay, startOfMonth } from "date-fns";

import { prisma } from "@/lib/prisma";

export async function getAdminStats() {
  const now = new Date();
  const today = startOfDay(now);
  const monthStart = startOfMonth(now);
  const weekStart = subDays(today, 6);

  const [usersTotal, successfulPayments, activeSubscriptions] = await Promise.all([
    prisma.user.count(),
    prisma.payment.findMany({
      where: { status: "SUCCEEDED" },
      select: {
        amount: true,
        paidAt: true,
        userId: true
      }
    }),
    prisma.subscription.count({
      where: { status: "ACTIVE" }
    })
  ]);

  const sums = successfulPayments.reduce(
    (acc, payment) => {
      const paidAt = payment.paidAt ?? new Date(0);
      acc.total += payment.amount;
      if (paidAt >= today) acc.today += payment.amount;
      if (paidAt >= weekStart) acc.week += payment.amount;
      if (paidAt >= monthStart) acc.month += payment.amount;
      acc.buyers.add(payment.userId);
      return acc;
    },
    {
      today: 0,
      week: 0,
      month: 0,
      total: 0,
      buyers: new Set<string>()
    }
  );

  const conversion = usersTotal ? Number(((sums.buyers.size / usersTotal) * 100).toFixed(1)) : 0;

  return {
    revenueToday: sums.today,
    revenueWeek: sums.week,
    revenueMonth: sums.month,
    revenueTotal: sums.total,
    activeSubscriptions,
    totalUsers: usersTotal,
    conversion,
    revenue: {
      today: sums.today,
      week: sums.week,
      month: sums.month,
      total: sums.total
    },
    conversionRate: conversion
  };
}

export async function getRevenueChartData() {
  const start = subDays(startOfDay(new Date()), 29);
  const payments = await prisma.payment.findMany({
    where: {
      status: "SUCCEEDED",
      paidAt: { gte: start }
    },
    select: {
      amount: true,
      paidAt: true
    }
  });

  const buckets = new Map<string, number>();
  for (let index = 0; index < 30; index += 1) {
    const day = subDays(startOfDay(new Date()), 29 - index);
    const label = day.toISOString().slice(0, 10);
    buckets.set(label, 0);
  }

  for (const payment of payments) {
    const key = (payment.paidAt ?? new Date()).toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + payment.amount);
  }

  return Array.from(buckets.entries()).map(([date, revenue]) => ({
    date,
    revenue: revenue / 100,
    amount: revenue
  }));
}

export async function getRevenueChart() {
  const data = await getRevenueChartData();
  return data.map((item) => ({
    date: item.date,
    amount: item.amount
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

  return { items, total };
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
