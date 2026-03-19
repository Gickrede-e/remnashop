import { z } from "zod";

export const planSchema = z.object({
  slug: z.string().trim().min(2).max(64),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  durationDays: z.coerce.number().int().positive(),
  trafficGB: z.coerce.number().int().positive(),
  priceRubles: z.coerce.number().positive(),
  highlight: z.string().trim().max(80).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true)
});
