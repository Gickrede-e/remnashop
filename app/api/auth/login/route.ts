import { signSession, setSessionCookie } from "@/lib/auth/session";
import { apiError, apiOk, parseRequestBody } from "@/lib/http";
import { loginSchema } from "@/lib/schemas/auth";
import { loginUser } from "@/lib/services/auth";

export async function POST(request: Request) {
  try {
    const body = await parseRequestBody(request, loginSchema);
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
    return apiError(error instanceof Error ? error.message : "Не удалось войти", 400);
  }
}
