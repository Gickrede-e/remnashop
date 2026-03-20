import { z } from "zod";

import { emailSchema, passwordSchema } from "@/lib/validators/common";

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  referralCode: z.string().trim().optional()
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

export const telegramLoginSchema = z.object({
  id: z.union([z.string(), z.number()]).transform((value) => String(value)),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().url().optional(),
  auth_date: z.union([z.string(), z.number()]).transform((value) => String(value)),
  hash: z.string().min(1)
});
