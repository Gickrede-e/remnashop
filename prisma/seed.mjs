import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, PromoCodeType, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const adminEmail = process.env.ADMIN_EMAILS?.split(",")[0]?.trim();
const adminInitialPassword = process.env.ADMIN_INITIAL_PASSWORD?.trim();

if (adminEmail && !adminInitialPassword) {
  throw new Error(
    "ADMIN_INITIAL_PASSWORD must be set when ADMIN_EMAILS is configured. Set it before the first db:seed or pre-create the admin manually."
  );
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString })
});

const promoCodes = [
  {
    code: "WELCOME10",
    type: PromoCodeType.DISCOUNT_PERCENT,
    value: 10,
    maxUsages: 100,
    maxUsagesPerUser: 1,
    isActive: true
  }
];

async function main() {
  for (const promo of promoCodes) {
    await prisma.promoCode.upsert({
      where: { code: promo.code },
      update: promo,
      create: promo
    });
  }

  if (adminEmail && adminInitialPassword) {
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: Role.ADMIN },
      create: {
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminInitialPassword, 12),
        role: Role.ADMIN
      }
    });
  }
}

try {
  await main();
} catch (error) {
  // intentional console.error: seed is a one-shot script outside the app runtime
  console.error("Seed failed", error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
