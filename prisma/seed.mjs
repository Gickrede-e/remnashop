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

const plans = [
  {
    slug: "starter",
    name: "Стартовый",
    durationDays: 30,
    trafficGB: 50,
    price: 14900,
    sortOrder: 1,
    highlight: null,
    remnawaveExternalSquadUuid: null,
    remnawaveInternalSquadUuids: [],
    remnawaveHwidDeviceLimit: null
  },
  {
    slug: "pro",
    name: "Про",
    durationDays: 30,
    trafficGB: 150,
    price: 29900,
    sortOrder: 2,
    highlight: "Популярный",
    remnawaveExternalSquadUuid: null,
    remnawaveInternalSquadUuids: [],
    remnawaveHwidDeviceLimit: null
  },
  {
    slug: "ultra",
    name: "Ультра",
    durationDays: 30,
    trafficGB: 500,
    price: 49900,
    sortOrder: 3,
    highlight: null,
    remnawaveExternalSquadUuid: null,
    remnawaveInternalSquadUuids: [],
    remnawaveHwidDeviceLimit: null
  },
  {
    slug: "annual",
    name: "Годовой",
    durationDays: 365,
    trafficGB: 2000,
    price: 249900,
    sortOrder: 4,
    highlight: "Выгодный",
    remnawaveExternalSquadUuid: null,
    remnawaveInternalSquadUuids: [],
    remnawaveHwidDeviceLimit: null
  }
];

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
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan
    });
  }

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

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
