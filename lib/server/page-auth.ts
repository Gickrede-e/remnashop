import "server-only";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/services/auth";

export async function requirePageUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requirePageAdmin() {
  const user = await requirePageUser();
  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return user;
}
