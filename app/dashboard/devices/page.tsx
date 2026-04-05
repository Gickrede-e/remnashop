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
      <div className="grid gap-4 sm:gap-6">
        <ScreenHeader
          eyebrow="Устройства"
          title="Подключённые устройства"
          description="Оформите подписку, чтобы увидеть подключённые устройства."
        />
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <MonitorSmartphone className="h-6 w-6 text-zinc-400" />
            <p className="text-sm leading-6 text-zinc-300">Здесь будут отображаться все устройства, привязанные к вашей подписке. Для начала:</p>
          </div>
          <ol className="grid gap-4 sm:grid-cols-3">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-zinc-300">
                  <step.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{step.title}</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-400">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
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
