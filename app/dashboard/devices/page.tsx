import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/components/blocks/dashboard/dashboard-page-header";
import { DeviceList } from "@/components/blocks/dashboard/device-list";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getUserDevices } from "@/lib/services/remnawave";

export const dynamic = "force-dynamic";

export default async function DevicesPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      remnawaveUuid: true,
      subscription: {
        select: {
          plan: {
            select: { remnawaveHwidDeviceLimit: true }
          }
        }
      }
    }
  });

  const deviceLimit = user?.subscription?.plan?.remnawaveHwidDeviceLimit ?? null;

  if (!user?.remnawaveUuid) {
    return (
      <div className="dashboardWorkspacePage dashboardSurfacePage dashboardSurfacePageDevices dashShellPageWrapper">
        <DashboardPageHeader
          title="Устройства"
          crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Устройства" }]}
        />
        <DeviceList devices={[]} total={0} deviceLimit={deviceLimit} />
      </div>
    );
  }

  const { devices, total } = await getUserDevices(user.remnawaveUuid);

  return (
    <div className="dashboardWorkspacePage dashboardSurfacePage dashboardSurfacePageDevices dashShellPageWrapper">
      <DashboardPageHeader
        title="Устройства"
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Устройства" }]}
      />
      <DeviceList devices={devices} total={total} deviceLimit={deviceLimit} />
    </div>
  );
}
