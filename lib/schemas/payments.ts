import { PaymentProvider, PromoCodeType } from "@prisma/client";
import { z } from "zod";

const optionalDateStringSchema = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), "Invalid datetime");

export const paymentCreateSchema = z.object({
  planId: z.string().min(1),
  provider: z.enum(PaymentProvider),
  promoCode: z.string().trim().toUpperCase().optional()
});

export const promoValidateSchema = z.object({
  planId: z.string().min(1),
  code: z.string().trim().min(1).max(64).transform((value) => value.toUpperCase())
});

export const promoCreateSchema = z.object({
  code: z.string().trim().min(2).max(64).transform((value) => value.toUpperCase()),
  type: z.enum(PromoCodeType),
  value: z.coerce.number().int().min(1),
  maxUsages: z.coerce.number().int().positive().optional().nullable(),
  maxUsagesPerUser: z.coerce.number().int().positive().default(1),
  minAmount: z.coerce.number().int().min(0).optional().nullable(),
  applicablePlanIds: z.array(z.string()).default([]),
  startsAt: optionalDateStringSchema,
  expiresAt: optionalDateStringSchema.nullable(),
  isActive: z.boolean().default(true)
});
