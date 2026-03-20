import "server-only";

import { prisma } from "@/lib/prisma";
import { writeAdminLog } from "@/lib/services/admin-logs";
import { syncSubscriptionForUser } from "@/lib/services/subscriptions";

export async function listUsers(options: {
  page: number;
  limit: number;
  search?: string;
}) {
  const search = options.search?.trim();
  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: "insensitive" as const } },
          { remnawaveUsername: { contains: search, mode: "insensitive" as const } },
          { referralCode: { contains: search, mode: "insensitive" as const } }
        ]
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        subscription: true,
        payments: {
          select: {
            amount: true,
            status: true
          },
          where: {
            status: "SUCCEEDED"
          },
          orderBy: {
            createdAt: "desc"
          },
          take: 3
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      skip: (options.page - 1) * options.limit,
      take: options.limit
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
  const totalSpentByUserId = new Map(
    totals.map((entry) => [entry.userId, entry._sum.amount ?? 0])
  );

  return {
    items: items.map((user) => ({
      ...user,
      totalSpent: totalSpentByUserId.get(user.id) ?? 0
    })),
    total
  };
}

export async function syncUserByAdmin(input: {
  adminId: string;
  userId: string;
}) {
  const result = await syncSubscriptionForUser(input.userId);

  await writeAdminLog({
    adminId: input.adminId,
    action: "SYNC_USER",
    targetType: "USER",
    targetId: input.userId,
    details: {
      syncedAt: new Date().toISOString()
    }
  });

  return result;
}
