import { logger, serializeError } from "@/lib/server/logger";

export async function register() {
  if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const startupLog = logger.child({ component: "startup" });

  try {
    const { syncAdminRolesFromEnv } = await import("@/lib/auth/roles");
    const result = await syncAdminRolesFromEnv();

    if (result.promotedCount || result.demotedCount) {
      startupLog.info("admin_roles.synced", {
        promoted: result.promotedCount,
        demoted: result.demotedCount
      });
    }
  } catch (error) {
    startupLog.error("admin_roles.sync_failed", { error: serializeError(error) });
  }
}
