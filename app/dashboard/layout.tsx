import { redirect } from "next/navigation";

import { AppShell } from "@/components/shell/app-shell";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <AppShell
      area="dashboard"
      canAccessAdmin={session.role === "ADMIN"}
      accountSummary={{ email: session.email }}
    >
      {children}
    </AppShell>
  );
}
