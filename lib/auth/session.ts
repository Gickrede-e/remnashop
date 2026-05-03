import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";

import { resolveRoleForEmail } from "@/lib/auth/roles";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { env } from "@/lib/env";

export type SessionPayload = {
  userId: string;
  email: string;
  role: "USER" | "ADMIN";
};

const sessionSecret = new TextEncoder().encode(env.JWT_SECRET);

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(sessionSecret);
}

export async function verifySession(token: string) {
  const verified = await jwtVerify<SessionPayload>(token, sessionSecret);
  return {
    ...verified.payload,
    role: resolveRoleForEmail(verified.payload.email)
  };
}

// Sliding-session helper: re-sign the JWT once the user is past the halfway point
// of its lifetime. Active users (who hit a protected page at least once every
// ~3.5 days) effectively never get logged out, while idle sessions still expire
// at the original 7-day mark. Called from proxy.ts on each authenticated request.
export async function refreshSessionIfNeeded(
  payload: SessionPayload & { iat?: number; exp?: number }
): Promise<string | null> {
  if (typeof payload.iat !== "number" || typeof payload.exp !== "number") {
    return null;
  }
  const lifetime = payload.exp - payload.iat;
  const elapsed = Math.floor(Date.now() / 1000) - payload.iat;
  if (elapsed * 2 < lifetime) {
    return null;
  }
  return signSession({
    userId: payload.userId,
    email: payload.email,
    role: payload.role
  });
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7
};

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    return await verifySession(token);
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requireAdminSession() {
  const session = await requireSession();
  if (session.role !== "ADMIN") {
    redirect("/dashboard");
  }
  return session;
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0)
  });
}
