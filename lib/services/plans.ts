import { prisma } from "@/lib/prisma";

type PlanInput = {
  slug: string;
  name: string;
  description?: string | null;
  durationDays: number;
  trafficGB: number;
  priceRubles?: number;
  priceRub?: number;
  highlight?: string | null;
  remnawaveExternalSquadUuid?: string | null;
  remnawaveInternalSquadUuids?: string[];
  remnawaveHwidDeviceLimit?: number | null;
  sortOrder: number;
  isActive: boolean;
};

function toPlanData(input: PlanInput) {
  return {
    slug: input.slug,
    name: input.name,
    description: input.description || null,
    durationDays: input.durationDays,
    trafficGB: input.trafficGB,
    price: Math.round((input.priceRubles ?? input.priceRub ?? 0) * 100),
    highlight: input.highlight || null,
    remnawaveExternalSquadUuid: input.remnawaveExternalSquadUuid || null,
    remnawaveInternalSquadUuids: Array.from(
      new Set((input.remnawaveInternalSquadUuids ?? []).map((item) => item.trim()).filter(Boolean))
    ),
    remnawaveHwidDeviceLimit: input.remnawaveHwidDeviceLimit ?? null,
    sortOrder: input.sortOrder,
    isActive: input.isActive
  };
}

export async function getActivePlans() {
  return prisma.plan.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { price: "asc" }]
  });
}

export const getPublicPlans = getActivePlans;

export async function getAllPlans() {
  return prisma.plan.findMany({
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }]
  });
}

export async function getPlanById(id: string) {
  return prisma.plan.findUnique({ where: { id } });
}

export async function createPlan(input: PlanInput) {
  return prisma.plan.create({
    data: toPlanData(input)
  });
}

export async function updatePlan(id: string, input: PlanInput) {
  return prisma.plan.update({
    where: { id },
    data: toPlanData(input)
  });
}

export async function deactivatePlan(id: string) {
  return prisma.plan.update({
    where: { id },
    data: { isActive: false }
  });
}

export async function setPlanActiveState(id: string, isActive: boolean) {
  return prisma.plan.update({
    where: { id },
    data: { isActive }
  });
}

export async function restorePlan(id: string) {
  return setPlanActiveState(id, true);
}

export const softDeletePlan = deactivatePlan;
