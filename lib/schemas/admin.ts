import { z } from "zod";

export const grantSubscriptionSchema = z.object({
  userId: z.string().min(1),
  planId: z.string().min(1),
  durationDays: z.coerce.number().int().positive().optional(),
  trafficGB: z.coerce.number().int().positive().optional(),
  note: z.string().trim().max(300).optional()
});

export const toggleUserSchema = z.object({
  enabled: z.boolean().optional()
});

const emailBroadcastContentSchema = z.object({
  subject: z.string().trim().min(1, "Укажите тему письма").max(200),
  text: z.string().trim().min(1, "Напишите текст письма").max(20_000)
});

export const emailBroadcastSchema = z.discriminatedUnion("audience", [
  emailBroadcastContentSchema.extend({ audience: z.enum(["ALL", "ACTIVE"]) }),
  emailBroadcastContentSchema.extend({
    audience: z.literal("ONE"),
    email: z.string().trim().email("Введите корректный адрес")
  })
]);
