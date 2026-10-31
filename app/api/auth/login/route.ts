import { type NextRequest } from "next/server";

import { issueSessionCookie } from "@/lib/auth/session";
import { apiError, apiErrorFrom, apiOk, getClientIp, parseRequestBody } from "@/lib/http";
import { loginSchema } from "@/lib/schemas/auth";
import { RateLimitExceededError, enforceRateLimit } from "@/lib/server/rate-limit";
import { withApiLogging } from "@/lib/server/with-api-logging";
import { loginUser } from "@/lib/services/auth";

export async function POST(request: NextRequest) {
  return withApiLogging(request, async () => {
    try {
      const body = await parseRequestBody(request, loginSchema);

      // Per-IP burst cap.
      enforceRateLimit({
        key: `login:ip:${getClientIp(request) || "unknown"}`,
        max: 10,
        windowMs: 60_000
      });

      // Per-account cap (independent of IP): stops a distributed brute-force from
      // spreading attempts against one email across many source IPs. NOTE: the
      // limiter is in-memory/per-process (see lib/server/rate-limit.ts) — move it
      // to a shared store before scaling the app beyond one replica.
      enforceRateLimit({
        key: `login:email:${body.email.toLowerCase()}`,
        max: 5,
        windowMs: 15 * 60_000
      });

      const user = await loginUser(body);
      await issueSessionCookie(user);

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

      return apiErrorFrom(error, "Не удалось войти");
    }
  });
}
