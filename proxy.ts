import { NextResponse, type NextRequest } from "next/server";

import { verifySession } from "@/lib/auth/session";
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

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
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

    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL(buildLoginHref(nextPath), request.url));
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"]
};
