import { PaymentProvider } from "@prisma/client";
import { z } from "zod";

import { cuidSchema } from "@/lib/validators/common";

export const promoValidateSchema = z.object({
  code: z.string().trim().min(2).max(64),
  planId: cuidSchema
});

export const createPaymentSchema = z.object({
  planId: cuidSchema,
  provider: z.enum(PaymentProvider),
  promoCode: z.string().trim().max(64).optional()
});
