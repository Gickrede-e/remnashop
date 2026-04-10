import { redirect } from "next/navigation";
import Link from "next/link";
import { CreditCard, MonitorSmartphone, Settings, Wifi } from "lucide-react";

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
    const steps = [
      { icon: CreditCard, title: "Выберите тариф", text: "Перейдите на страницу покупки и оплатите подходящий план." },
      { icon: Settings, title: "Получите данные", text: "После оплаты в кабинете появится ссылка для подключения." },
      { icon: Wifi, title: "Подключайтесь", text: "Установите приложение на устройство и вставьте ссылку." },
    ];

    return (
      <div className="dashboardWorkspacePage dashboardSurfacePage dashboardSurfacePageDevices">
        <ScreenHeader
          eyebrow="Устройства"
          title="Подключённые устройства"
          description="Оформите подписку, чтобы увидеть подключённые устройства."
        />
        <div className="deviceGuidePanel panel">
          <div className="deviceGuideLead">
            <MonitorSmartphone className="deviceGuideLeadIcon iconMd" />
            <p className="deviceGuideLeadText">
              Здесь будут отображаться все устройства, привязанные к вашей подписке. Для начала:
            </p>
          </div>
          <ol className="deviceGuideList">
            {steps.map((step) => (
              <li key={step.title} className="deviceGuideStep">
                <span className="deviceGuideIcon">
                  <step.icon className="iconSm" />
                </span>
                <div className="deviceGuideCopy">
                  <p className="deviceGuideTitle">{step.title}</p>
                  <p className="deviceGuideDescription">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <Button asChild className="commandButton commandButtonPrimary deviceGuideAction">
          <Link href="/dashboard/buy">Купить подписку</Link>
        </Button>
      </div>
    );
  }

  const { devices, total } = await getUserDevices(user.remnawaveUuid);
  const deviceLimit = user.subscription?.plan?.remnawaveHwidDeviceLimit ?? null;

  return (
    <div className="dashboardWorkspacePage dashboardSurfacePage dashboardSurfacePageDevices">
      <ScreenHeader
        eyebrow="Устройства"
        title="Подключённые устройства"
        description="Список устройств, привязанных к вашей подписке. Вы можете удалить ненужные."
      />
      <DeviceList devices={devices} total={total} deviceLimit={deviceLimit} />
    </div>
  );
}
