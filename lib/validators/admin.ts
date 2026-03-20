import { PromoCodeType } from "@prisma/client";
import { z } from "zod";

import { cuidSchema } from "@/lib/validators/common";

const optionalPositiveIntField = z.preprocess((value) => {
  if (value === "" || value == null || Number.isNaN(value)) {
    return undefined;
  }

  return value;
}, z.number().int().positive().optional());

const optionalDateTimeField = z.preprocess((value) => {
  if (value === "" || value == null) {
    return undefined;
  }

  return value;
}, z.string().trim().min(1).optional());

export const planUpsertSchema = z.object({
  slug: z.string().trim().min(2).max(64),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  durationDays: z.number().int().positive(),
  trafficGB: z.number().int().positive(),
  priceRub: z.number().positive(),
  highlight: z.string().trim().max(40).optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true)
});

export const promoUpsertSchema = z.object({
  code: z.string().trim().min(2).max(64).transform((value) => value.toUpperCase()),
  type: z.enum(PromoCodeType),
  value: z.number().int().positive(),
  maxUsages: optionalPositiveIntField,
  maxUsagesPerUser: z.number().int().positive().default(1),
  minAmount: optionalPositiveIntField,
  applicablePlanIds: z.array(cuidSchema).default([]),
  startsAt: optionalDateTimeField,
  expiresAt: optionalDateTimeField,
  isActive: z.boolean().default(true)
});

export const grantSubscriptionSchema = z.object({
  userId: cuidSchema,
  planId: cuidSchema,
  durationDays: z.coerce.number().int().positive().optional(),
  trafficGB: z.coerce.number().int().positive().optional(),
  note: z.string().trim().max(500).optional()
});

export const toggleUserSchema = z.object({
  enabled: z.boolean()
});
