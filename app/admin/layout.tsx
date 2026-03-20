import { redirect } from "next/navigation";

import { AdminSidebar } from "@/components/admin/sidebar-nav";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="container py-6 md:py-8 lg:py-10">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <AdminSidebar />
        <div className="grid min-w-0 gap-6">{children}</div>
      </div>
    </div>
  );
}
