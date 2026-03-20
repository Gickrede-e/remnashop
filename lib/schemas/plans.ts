import { z } from "zod";

export const planSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(16, "Slug должен быть не длиннее 16 символов, чтобы соответствовать Tag в Remnawave")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug должен содержать только латиницу, цифры и дефисы"),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  durationDays: z.coerce.number().int().positive(),
  trafficGB: z.coerce.number().int().positive(),
  priceRubles: z.coerce.number().positive(),
  highlight: z.string().trim().max(80).optional().nullable(),
  remnawaveExternalSquadUuid: z
    .union([z.string().uuid(), z.literal(""), z.null()])
    .optional()
    .transform((value) => value || null),
  remnawaveInternalSquadUuids: z.array(z.string().uuid()).default([]),
  remnawaveHwidDeviceLimit: z
    .union([z.coerce.number().int().positive(), z.null()])
    .optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true)
});
