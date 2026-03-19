import { prisma } from "@/lib/prisma";

function escapeCsvValue(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n;]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function rowsToCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) {
    return "\uFEFF";
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(","))
  ];
  return `\uFEFF${lines.join("\n")}`;
}

export async function exportEntityToCsv(entity: "users" | "payments" | "subscriptions") {
  if (entity === "users") {
    const users = await prisma.user.findMany({
      include: {
        subscription: true
      },
      orderBy: { createdAt: "desc" }
    });
    return rowsToCsv(
      users.map((user) => ({
        id: user.id,
        email: user.email,
        role: user.role,
        referralCode: user.referralCode,
        remnawaveUuid: user.remnawaveUuid ?? "",
        createdAt: user.createdAt.toISOString(),
        subscriptionStatus: user.subscription?.status ?? ""
      }))
    );
  }

  if (entity === "payments") {
    const payments = await prisma.payment.findMany({
      include: {
        user: true,
        plan: true
      },
      orderBy: { createdAt: "desc" }
    });
    return rowsToCsv(
      payments.map((payment) => ({
        id: payment.id,
        email: payment.user.email,
        plan: payment.plan.name,
        provider: payment.provider,
        status: payment.status,
        amountRub: payment.amount / 100,
        createdAt: payment.createdAt.toISOString(),
        paidAt: payment.paidAt?.toISOString() ?? ""
      }))
    );
  }

  const subscriptions = await prisma.subscription.findMany({
    include: {
      user: true,
      plan: true
    },
    orderBy: { updatedAt: "desc" }
  });

  return rowsToCsv(
    subscriptions.map((subscription) => ({
      id: subscription.id,
      email: subscription.user.email,
      plan: subscription.plan.name,
      status: subscription.status,
      startsAt: subscription.startsAt?.toISOString() ?? "",
      expiresAt: subscription.expiresAt?.toISOString() ?? "",
      trafficLimitBytes: subscription.trafficLimitBytes?.toString() ?? "",
      trafficUsedBytes: subscription.trafficUsedBytes?.toString() ?? ""
    }))
  );
}

export const exportEntity = exportEntityToCsv;

export async function listPaymentsForAdmin(input: {
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
        user: true,
        plan: true,
        promoCode: true
      },
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.limit,
      take: input.limit
    }),
    prisma.payment.count({ where })
  ]);

  return { items, total };
}
