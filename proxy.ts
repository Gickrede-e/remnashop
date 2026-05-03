import { NextResponse, type NextRequest } from "next/server";

import {
  SESSION_COOKIE_OPTIONS,
  refreshSessionIfNeeded,
  verifySession
} from "@/lib/auth/session";
import { buildLoginHref } from "@/lib/auth/navigation";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

const ADMIN_PATH = "/admin";
const DASHBOARD_PATH = "/dashboard";

function isProtectedPath(pathname: string) {
  return (
    pathname === ADMIN_PATH ||
    pathname.startsWith(`${ADMIN_PATH}/`) ||
    pathname === DASHBOARD_PATH ||
    pathname.startsWith(`${DASHBOARD_PATH}/`)
  );
}

// Per-request CSP nonce. Replaces the static CSP previously set by Caddy.
// 'strict-dynamic' lets Next.js/React load chunked scripts (which inherit the nonce)
// without us enumerating every script source. Inline <script>/<style> tags will only
// execute when they carry the matching nonce.
function buildCsp(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.yookassa.ru https://*.platega.io",
    "frame-src 'self' https://yookassa.ru https://*.yookassa.ru https://*.platega.io",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self' https://yookassa.ru https://*.platega.io",
    "object-src 'none'",
    "upgrade-insecure-requests"
  ].join("; ");
}

function generateNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64");
}

function withSecurityHeaders(response: NextResponse, nonce: string) {
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  return response;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const nonce = generateNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  if (!isProtectedPath(pathname)) {
    return withSecurityHeaders(
      NextResponse.next({ request: { headers: requestHeaders } }),
      nonce
    );
  }

  const needsAdminSession = pathname === ADMIN_PATH || pathname.startsWith(`${ADMIN_PATH}/`);
  const nextPath = `${pathname}${request.nextUrl.search}`;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL(buildLoginHref(nextPath), request.url));
  }

  try {
    const session = await verifySession(token);
    if (needsAdminSession && session.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    const response = withSecurityHeaders(
      NextResponse.next({ request: { headers: requestHeaders } }),
      nonce
    );

    // Sliding session: re-issue the JWT past its halfway point so active users
    // never get logged out. Idle users still expire at the original 7-day mark.
    const refreshed = await refreshSessionIfNeeded(session);
    if (refreshed) {
      response.cookies.set(SESSION_COOKIE_NAME, refreshed, SESSION_COOKIE_OPTIONS);
    }

    return response;
  } catch {
    const response = NextResponse.redirect(new URL(buildLoginHref(nextPath), request.url));
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }
}

export const config = {
  // Run on every HTML-bearing request so the CSP header lands on the document and
  // protected paths get auth-gated. Skips API routes (their handlers manage their
  // own headers) and static assets (no CSP overhead per chunk).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]
};
