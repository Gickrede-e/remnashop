import { PrismaPg } from "@prisma/adapter-pg";
import { type Prisma, PrismaClient } from "@prisma/client";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });
}

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma = globalThis.prismaGlobal ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

// The shared client or an interactive-transaction client: lets a service helper
// run inside a caller's transaction or stand alone.
export type DbClient = typeof prisma | Prisma.TransactionClient;

// Round-trips a value through JSON so it becomes a plain Prisma JSON value
// (drops undefined, turns Dates into strings) — the one place that incantation lives.
export function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
