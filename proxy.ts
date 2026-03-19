import { NextResponse, type NextRequest } from "next/server";

import { verifySession } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

const DASHBOARD_PATH = "/dashboard";
const ADMIN_PATH = "/admin";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const needsDashboardSession = pathname.startsWith(DASHBOARD_PATH);
  const needsAdminSession = pathname.startsWith(ADMIN_PATH);

  if (!needsDashboardSession && !needsAdminSession) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const session = await verifySession(token);
    if (needsAdminSession && session.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"]
};
