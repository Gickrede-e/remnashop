import { z } from "zod";

export const grantSubscriptionSchema = z.object({
  userId: z.string().min(1),
  planId: z.string().min(1),
  durationDays: z.coerce.number().int().positive().optional(),
  trafficGB: z.coerce.number().int().positive().optional(),
  note: z.string().trim().max(300).optional()
});

export const revokeSubscriptionSchema = z.object({
  subscriptionId: z.string().min(1)
});

export const toggleUserSchema = z.object({
  enabled: z.boolean().optional()
});
