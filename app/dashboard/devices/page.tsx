import { redirect } from "next/navigation";
import Link from "next/link";

import { DeviceList } from "@/components/blocks/dashboard/device-list";
import { Button } from "@/components/ui/button";
import { ScreenHeader } from "@/components/shell/screen-header";
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

  if (!user?.remnawaveUuid) {
    return (
      <div className="grid gap-4 sm:gap-6">
        <ScreenHeader
          eyebrow="Устройства"
          title="Подключённые устройства"
          description="Оформите подписку, чтобы увидеть подключённые устройства."
        />
        <Button asChild className="w-fit">
          <Link href="/dashboard/buy">Купить подписку</Link>
        </Button>
      </div>
    );
  }

  const { devices, total } = await getUserDevices(user.remnawaveUuid);
  const deviceLimit = user.subscription?.plan?.remnawaveHwidDeviceLimit ?? null;

  return (
    <div className="grid gap-4 sm:gap-6">
      <ScreenHeader
        eyebrow="Устройства"
        title="Подключённые устройства"
        description="Список устройств, привязанных к вашей подписке. Вы можете удалить ненужные."
      />
      <DeviceList devices={devices} total={total} deviceLimit={deviceLimit} />
    </div>
  );
}
