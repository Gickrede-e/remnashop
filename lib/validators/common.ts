import { z } from "zod";

export const cuidSchema = z.string().cuid();
export const emailSchema = z.string().email().transform((value) => value.trim().toLowerCase());
export const passwordSchema = z.string().min(8).max(128);
export const positiveMoneyKopecksSchema = z.number().int().min(0);
export const positiveGbSchema = z.number().int().min(0);
