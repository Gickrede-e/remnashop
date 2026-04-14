import { type NextRequest } from "next/server";
import { z } from "zod";

import { signSession, setSessionCookie } from "@/lib/auth/session";
import { apiError, apiOk, getClientIp, parseRequestBody } from "@/lib/http";
import { env } from "@/lib/env";
import { registerSchema } from "@/lib/schemas/auth";
import { RateLimitExceededError, enforceRateLimit } from "@/lib/server/rate-limit";
import { registerUser, registerUserWithHash } from "@/lib/services/auth";
import { verifyVerificationToken } from "@/lib/services/verification-tokens";

// Schema used when EMAIL_ENABLED=true: email + OTP code (no password — it was pre-hashed)
const otpRegisterSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6)
});

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit({
      key: `register:${getClientIp(request) || "unknown"}`,
      max: 10,
      windowMs: 60_000
    });

    if (env.EMAIL_ENABLED) {
      // OTP flow: verify code and create user with pre-hashed password
      const body = await parseRequestBody(request, otpRegisterSchema);
      const email = body.email.toLowerCase();

      const data = await verifyVerificationToken(email, body.code, "REGISTRATION");
      if (!data || typeof data.passwordHash !== "string") {
        return apiError("Данные регистрации недействительны. Попробуйте снова.");
      }

      const user = await registerUserWithHash({
        email,
        passwordHash: data.passwordHash,
        referralCode: typeof data.referralCode === "string" ? data.referralCode : undefined
      });

      const token = await signSession({ userId: user.id, email: user.email, role: user.role });
      await setSessionCookie(token);

      return apiOk({ user: { id: user.id, email: user.email, role: user.role } });
    }

    // Standard flow (EMAIL_ENABLED=false): email + password
    const body = await parseRequestBody(request, registerSchema);
    const user = await registerUser(body);
    const token = await signSession({ userId: user.id, email: user.email, role: user.role });
    await setSessionCookie(token);

    return apiOk({ user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return apiError("Слишком много попыток, попробуйте позже", 429);
    }

    return apiError(error instanceof Error ? error.message : "Не удалось зарегистрироваться");
  }
}
