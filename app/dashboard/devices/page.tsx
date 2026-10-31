import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/components/blocks/dashboard/dashboard-page-header";
import { DeviceList } from "@/components/blocks/dashboard/device-list";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getRemnawaveUser, getUserDevices } from "@/lib/services/remnawave";
import { resolveExternalSubscriptionUrl } from "@/lib/services/remnawave-identity";

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
      remnawaveShortUuid: true,
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
  const header = (
    <DashboardPageHeader
      title="Устройства"
      crumbs={[{ label: "Кабинет", href: "/dashboard" }, { label: "Устройства" }]}
    />
  );

  if (!user?.remnawaveUuid) {
    return (
      <div className="dashboardWorkspacePage dashboardSurfacePage dashboardSurfacePageDevices dashShellPageWrapper">
        {header}
        <DeviceList devices={[]} total={0} deviceLimit={deviceLimit} subscriptionUrl={null} />
      </div>
    );
  }

  // The live subscriptionUrl, as on the home page's «Подключить»; a rebuilt /api/sub link may not be public.
  const [{ devices, total }, remnawaveUser] = await Promise.all([
    getUserDevices(user.remnawaveUuid),
    getRemnawaveUser(user.remnawaveUuid)
  ]);
  const subscriptionUrl = resolveExternalSubscriptionUrl(remnawaveUser, user.remnawaveShortUuid);

  return (
    <div className="dashboardWorkspacePage dashboardSurfacePage dashboardSurfacePageDevices dashShellPageWrapper">
      {header}
      <DeviceList devices={devices} total={total} deviceLimit={deviceLimit} subscriptionUrl={subscriptionUrl} />
    </div>
  );
}
