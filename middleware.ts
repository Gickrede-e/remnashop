import { NextResponse, type NextRequest } from "next/server";

// Per-request CSP nonce. The header replaces the static CSP previously set by Caddy.
// 'strict-dynamic' lets Next.js/React load chunked scripts (which inherit the nonce)
// without us enumerating every script source. Inline <script>/<style> tags will only
// execute when they carry the matching nonce.
function buildCsp(nonce: string) {
  const directives = [
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
  ];
  return directives.join("; ");
}

function generateNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64");
}

export function middleware(request: NextRequest) {
  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders }
  });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Run on every request that returns HTML so the CSP header lands on the document.
    // Skip Next.js internals and static assets to avoid CSP overhead on every chunk.
    {
      source: "/((?!_next/static|_next/image|favicon.ico|api/).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" }
      ]
    }
  ]
};
