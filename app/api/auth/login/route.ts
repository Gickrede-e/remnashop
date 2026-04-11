import { type NextRequest } from "next/server";

import { signSession, setSessionCookie } from "@/lib/auth/session";
import { apiError, apiOk, getClientIp, parseRequestBody } from "@/lib/http";
import { loginSchema } from "@/lib/schemas/auth";
import { RateLimitExceededError, enforceRateLimit } from "@/lib/server/rate-limit";
import { loginUser } from "@/lib/services/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await parseRequestBody(request, loginSchema);

    enforceRateLimit({
      key: `login:${getClientIp(request) || "unknown"}`,
      max: 10,
      windowMs: 60_000
    });

    const user = await loginUser(body);
    const token = await signSession({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    await setSessionCookie(token);

    return apiOk({
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return apiError("Слишком много попыток, попробуйте позже", 429);
    }

    return apiError(error instanceof Error ? error.message : "Не удалось войти", 400);
  }
}
