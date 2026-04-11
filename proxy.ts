import { NextResponse, type NextRequest } from "next/server";

import { verifySession } from "@/lib/auth/session";
import { buildLoginHref } from "@/lib/auth/navigation";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

const DASHBOARD_PATH = "/dashboard";
const ADMIN_PATH = "/admin";
const AUTH_PATHS = new Set(["/login", "/register"]);
const PUBLIC_API_PREFIXES = ["/api/auth/", "/api/webhook/"];
const PUBLIC_API_PATHS = new Set(["/api/health"]);

function isPublicPath(pathname: string) {
  if (AUTH_PATHS.has(pathname)) {
    return true;
  }

  if (PUBLIC_API_PATHS.has(pathname)) {
    return true;
  }

  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const needsAdminSession = pathname.startsWith(ADMIN_PATH);
  const nextPath = `${pathname}${request.nextUrl.search}`;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL(buildLoginHref(nextPath), request.url));
  }

  try {
    const session = await verifySession(token);
    if (needsAdminSession && session.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL(buildLoginHref(nextPath), request.url));
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)"]
};
