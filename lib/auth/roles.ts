import "server-only";

import { Role } from "@prisma/client";

import { getAdminEmails } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export function resolveRoleForEmail(email: string): Role {
  return getAdminEmails().includes(email.toLowerCase()) ? Role.ADMIN : Role.USER;
}

export async function syncAdminRolesFromEnv() {
  const adminEmails = getAdminEmails();

  const promoted = adminEmails.length
    ? await prisma.user.updateMany({
        where: {
          email: { in: adminEmails },
          role: { not: Role.ADMIN }
        },
        data: { role: Role.ADMIN }
      })
    : { count: 0 };

  const demoted = await prisma.user.updateMany({
    where: adminEmails.length
      ? {
          email: { notIn: adminEmails },
          role: { not: Role.USER }
        }
      : {
          role: { not: Role.USER }
        },
    data: { role: Role.USER }
  });

  return {
    adminEmails,
    promotedCount: promoted.count,
    demotedCount: demoted.count
  };
}
