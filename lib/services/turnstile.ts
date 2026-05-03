import { env } from "@/lib/env";
import { logger } from "@/lib/server/logger";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const VERIFY_TIMEOUT_MS = 5_000;

export class TurnstileError extends Error {
  constructor(message = "Капча не пройдена. Обновите страницу и попробуйте снова.") {
    super(message);
    this.name = "TurnstileError";
  }
}

// True when both client and server keys are configured. When false (typical for
// local dev), verifyTurnstileToken silently passes — the widget isn't rendered
// either, since the public key is empty.
export function isTurnstileConfigured() {
  return Boolean(env.TURNSTILE_SECRET_KEY && env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

// Verifies a Turnstile widget token against Cloudflare's siteverify endpoint.
// Throws TurnstileError on failure; never throws when Turnstile is disabled.
export async function verifyTurnstileToken(token: string | undefined, ip: string) {
  if (!isTurnstileConfigured()) {
    return;
  }
  if (!token) {
    throw new TurnstileError();
  }

  const body = new URLSearchParams({
    secret: env.TURNSTILE_SECRET_KEY,
    response: token,
    ...(ip ? { remoteip: ip } : {})
  });

  let response: Response;
  try {
    response = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      cache: "no-store",
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS)
    });
  } catch (error) {
    logger.warn("turnstile.verify_unreachable", {
      message: error instanceof Error ? error.message : "fetch failed"
    });
    // Fail closed — if Cloudflare is unreachable, treat as failure rather than
    // silently letting bots through.
    throw new TurnstileError("Не удалось проверить капчу. Попробуйте позже.");
  }

  if (!response.ok) {
    logger.warn("turnstile.verify_http_error", { status: response.status });
    throw new TurnstileError("Не удалось проверить капчу. Попробуйте позже.");
  }

  const result = (await response.json().catch(() => null)) as
    | { success?: boolean; "error-codes"?: string[] }
    | null;

  if (!result?.success) {
    logger.info("turnstile.verify_rejected", {
      errorCodes: result?.["error-codes"] ?? []
    });
    throw new TurnstileError();
  }
}
