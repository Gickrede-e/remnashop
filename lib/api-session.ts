import { getSession } from "@/lib/auth/session";

export class ApiSessionError extends Error {
  constructor(
    message: string,
    public status = 401
  ) {
    super(message);
  }
}

export async function requireApiSession() {
  const session = await getSession();
  if (!session) {
    throw new ApiSessionError("Требуется авторизация", 401);
  }
  return session;
}

export async function requireApiAdminSession() {
  const session = await requireApiSession();
  if (session.role !== "ADMIN") {
    throw new ApiSessionError("Недостаточно прав", 403);
  }
  return session;
}
