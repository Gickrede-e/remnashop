import { prisma } from "@/lib/prisma";

type AdminLogInput = {
  adminId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  details?: unknown;
};

export async function logAdminAction(input: AdminLogInput) {
  return prisma.adminLog.create({
    data: {
      adminId: input.adminId ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      details: input.details ? JSON.parse(JSON.stringify(input.details)) : undefined
    }
  });
}

export const writeAdminLog = logAdminAction;

export async function getAdminLogs(input: {
  page: number;
  limit: number;
  action?: string;
  adminId?: string;
}) {
  const where = {
    ...(input.action ? { action: input.action } : {}),
    ...(input.adminId ? { adminId: input.adminId } : {})
  };

  const [items, total] = await Promise.all([
    prisma.adminLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      include: {
        admin: {
          select: {
            id: true,
            email: true
          }
        }
      }
    }),
    prisma.adminLog.count({ where })
  ]);

  return { items, total };
}

export const listAdminLogs = getAdminLogs;
