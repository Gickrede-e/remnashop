import { prisma } from "@/lib/prisma";

const EXPORT_BATCH_SIZE = 1000;

export function escapeCsvValue(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n;]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function rowsToCsv(rows: Array<Record<string, unknown>>) {
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

async function exportRowsInBatches<TItem extends { id: string }>(
  loadBatch: (cursor: string | undefined) => Promise<TItem[]>,
  mapItem: (item: TItem) => Record<string, unknown>
) {
  let cursor: string | undefined;
  let headers: string[] | null = null;
  const lines: string[] = [];

  while (true) {
    const batch = await loadBatch(cursor);
    if (!batch.length) {
      break;
    }

    const rows = batch.map(mapItem);
    if (!headers && rows.length) {
      headers = Object.keys(rows[0]);
      lines.push(headers.join(","));
    }

    if (headers) {
      lines.push(...rows.map((row) => headers!.map((header) => escapeCsvValue(row[header])).join(",")));
    }

    cursor = batch[batch.length - 1]?.id;
  }

  return headers ? `\uFEFF${lines.join("\n")}` : "\uFEFF";
}

export async function exportEntityToCsv(entity: "users" | "payments" | "subscriptions") {
  if (entity === "users") {
    return exportRowsInBatches(
      (cursor) =>
        prisma.user.findMany({
          take: EXPORT_BATCH_SIZE,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          include: {
            subscription: true
          },
          orderBy: { id: "asc" }
        }),
      (user) => ({
        id: user.id,
        email: user.email,
        role: user.role,
        referralCode: user.referralCode,
        remnawaveUuid: user.remnawaveUuid ?? "",
        createdAt: user.createdAt.toISOString(),
        subscriptionStatus: user.subscription?.status ?? ""
      })
    );
  }

  if (entity === "payments") {
    return exportRowsInBatches(
      (cursor) =>
        prisma.payment.findMany({
          take: EXPORT_BATCH_SIZE,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          include: {
            user: true,
            plan: true
          },
          orderBy: { id: "asc" }
        }),
      (payment) => ({
        id: payment.id,
        email: payment.user.email,
        plan: payment.plan.name,
        provider: payment.provider,
        status: payment.status,
        amountRub: payment.amount / 100,
        createdAt: payment.createdAt.toISOString(),
        paidAt: payment.paidAt?.toISOString() ?? ""
      })
    );
  }

  return exportRowsInBatches(
    (cursor) =>
      prisma.subscription.findMany({
        take: EXPORT_BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: {
          user: true,
          plan: true
        },
        orderBy: { id: "asc" }
      }),
    (subscription) => ({
      id: subscription.id,
      email: subscription.user.email,
      plan: subscription.plan.name,
      status: subscription.status,
      startsAt: subscription.startsAt?.toISOString() ?? "",
      expiresAt: subscription.expiresAt?.toISOString() ?? "",
      trafficLimitBytes: subscription.trafficLimitBytes?.toString() ?? "",
      trafficUsedBytes: subscription.trafficUsedBytes?.toString() ?? ""
    })
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
