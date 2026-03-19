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
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
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
