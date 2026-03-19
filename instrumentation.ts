export async function register() {
  if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  try {
    const { syncAdminRolesFromEnv } = await import("@/lib/auth/roles");
    const result = await syncAdminRolesFromEnv();

    if (result.promotedCount || result.demotedCount) {
      console.info(
        `[startup] admin roles synced: +${result.promotedCount} / -${result.demotedCount}`
      );
    }
  } catch (error) {
    console.error("[startup] failed to sync admin roles", error);
  }
}
