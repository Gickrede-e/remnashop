import { z } from "zod";

// Cloudflare Turnstile token. Optional in schema so dev (no Turnstile keys) still
// works; the route handler enforces presence via verifyTurnstileToken when
// isTurnstileConfigured() is true.
const cfTurnstileToken = z.string().trim().optional();

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  referralCode: z.string().trim().optional(),
  cfTurnstileToken
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

export const sendVerificationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  referralCode: z.string().optional(),
  cfTurnstileToken
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
  cfTurnstileToken
});
