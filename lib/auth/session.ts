import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { cache } from "react";

import { resolveRoleForEmail } from "@/lib/auth/roles";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export type SessionPayload = {
  userId: string;
  email: string;
  role: "USER" | "ADMIN";
  // Session-revocation counter (see User.sessionVersion): the token is rejected
  // once the user's counter has moved past the value signed into it.
  sessionVersion: number;
};

// Wire form of the JWT: tokens issued before the revocation counter existed
// carry no sessionVersion and are normalized to 0 in verifySession.
type SessionClaims = Omit<SessionPayload, "sessionVersion"> & { sessionVersion?: number };

const sessionSecret = new TextEncoder().encode(env.JWT_SECRET);

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(sessionSecret);
}

export async function verifySession(token: string) {
  const verified = await jwtVerify<SessionClaims>(token, sessionSecret);
  return {
    ...verified.payload,
    role: resolveRoleForEmail(verified.payload.email),
    sessionVersion: verified.payload.sessionVersion ?? 0
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
    role: payload.role,
    sessionVersion: payload.sessionVersion
  });
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7
};

// Memoized per request (React cache): layout + page + API helpers all call this,
// and the revocation check below costs a DB round-trip.
export const getSession = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const session = await verifySession(token);
    // Server-side revocation check: reject the token if the user's sessionVersion
    // has moved past the value embedded at sign time (password change/reset bumps
    // it). This runs only in the node request path (server components + API routes
    // via requireApiSession), never in the edge-style proxy middleware, which uses
    // verifySession directly for its redirect gate. One indexed PK lookup.
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { sessionVersion: true }
    });
    if (!user) {
      return null;
    }
    if (session.sessionVersion !== user.sessionVersion) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
});

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
}

// The one way to log a user in: signs the session for `user` and sets the
// cookie, so the revocation counter can't be left out of a token.
export async function issueSessionCookie(user: {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  sessionVersion: number;
}) {
  await setSessionCookie(
    await signSession({ userId: user.id, email: user.email, role: user.role, sessionVersion: user.sessionVersion })
  );
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
