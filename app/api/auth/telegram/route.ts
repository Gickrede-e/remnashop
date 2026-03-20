import { signSession, setSessionCookie } from "@/lib/auth/session";
import { apiError, apiOk, parseRequestBody } from "@/lib/http";
import { telegramAuthSchema } from "@/lib/schemas/auth";
import { loginWithTelegram } from "@/lib/services/auth";

export async function POST(request: Request) {
  try {
    const body = await parseRequestBody(request, telegramAuthSchema);
    const user = await loginWithTelegram(body);
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
    return apiError(error instanceof Error ? error.message : "Telegram login failed", 400);
  }
}
