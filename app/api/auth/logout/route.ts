import { NextResponse } from "next/server";

import { clearSessionCookie } from "@/lib/auth/session";
import { apiOk } from "@/lib/http";

function isBrowserFormSubmission(request: Request) {
  const accept = request.headers.get("accept") ?? "";
  const contentType = request.headers.get("content-type") ?? "";

  return (
    accept.includes("text/html") ||
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data") ||
    contentType.includes("text/plain")
  );
}

export async function POST(request: Request) {
  await clearSessionCookie();

  if (isBrowserFormSubmission(request)) {
    return new NextResponse(null, {
      status: 303,
      headers: {
        location: "/login"
      }
    });
  }

  return apiOk({ success: true });
}
