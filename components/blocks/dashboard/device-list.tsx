"use client";

import { HardDrive, ShieldPlus, Smartphone } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { DashboardCard } from "@/components/blocks/dashboard/dashboard-card";
import { DashboardStatTile } from "@/components/blocks/dashboard/dashboard-stat-tile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

type Device = {
  hwid: string;
  platform: string | null;
  osVersion: string | null;
  deviceModel: string | null;
  createdAt: string;
};

type DeviceListProps = {
  devices: Device[];
  total: number;
  deviceLimit: number | null;
};

const onboardingSteps = [
  { title: "Выберите тариф", text: "Перейдите на страницу покупки и оплатите подходящий план." },
  { title: "Получите данные", text: "После оплаты в кабинете появится ссылка для подключения." },
  { title: "Подключайтесь", text: "Установите приложение на устройство и вставьте ссылку." }
] as const;

function getPlatformIcon(platform: string | null) {
  if (!platform) return "📟";
  const normalized = platform.toLowerCase();
  if (normalized.includes("ios") || normalized.includes("android")) return "📱";
  if (normalized.includes("mac")) return "🖥";
  if (normalized.includes("linux")) return "🐧";
  if (normalized.includes("windows")) return "💻";
  return "📟";
}

function formatDeviceDate(dateString: string) {
  try {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  } catch {
    return "";
  }
}

function DeviceRow({
  device,
  deleting,
  onDelete
}: {
  device: Device;
  deleting: boolean;
  onDelete: (hwid: string) => void;
}) {
  const model = device.deviceModel ?? device.platform ?? "Неизвестное устройство";
  const details = [
    device.platform,
    device.osVersion,
    device.createdAt ? `Добавлено ${formatDeviceDate(device.createdAt)}` : null
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="dashListItem is-not-completed">
      <div>
        <strong>
          {getPlatformIcon(device.platform)} {model}
        </strong>
        {details ? <p>{details}</p> : null}
      </div>
      <Button type="button" variant="outline" size="sm" disabled={deleting} onClick={() => onDelete(device.hwid)}>
        {deleting ? "..." : "Удалить"}
      </Button>
    </li>
  );
}

export function DeviceList({ devices, total, deviceLimit }: DeviceListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deletingHwid, setDeletingHwid] = useState<string | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const freeSlots = deviceLimit === null ? null : Math.max(deviceLimit - total, 0);

  function handleDelete(hwid: string) {
    if (!window.confirm("Удалить это устройство?")) return;

    setError(null);
    setDeletingHwid(hwid);
    startTransition(async () => {
      try {
        const response = await fetch("/api/devices/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hwid })
        });
        const payload = (await response.json().catch(() => null)) as { ok: boolean; error?: string } | null;

        if (!response.ok || !payload?.ok) {
          setError(payload?.error ?? "Не удалось удалить устройство");
          return;
        }

        router.refresh();
      } catch {
        setError("Не удалось выполнить запрос");
      } finally {
        setDeletingHwid(null);
      }
    });
  }

  function handleDeleteAll() {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/devices/delete-all", { method: "POST" });
        const payload = (await response.json().catch(() => null)) as { ok: boolean; error?: string } | null;

        if (!response.ok || !payload?.ok) {
          setError(payload?.error ?? "Не удалось удалить устройства");
          return;
        }

        setDeleteAllOpen(false);
        router.refresh();
      } catch {
        setError("Не удалось выполнить запрос");
      }
    });
  }

  return (
    <div className="dashWorkspace dashDevices">
      <div className="dashStatGrid">
        <DashboardStatTile icon={Smartphone} label="Устройств" value={String(total)} />
        <DashboardStatTile
          icon={HardDrive}
          label="Лимит"
          value={deviceLimit === null ? "—" : String(deviceLimit)}
        />
        <DashboardStatTile
          icon={ShieldPlus}
          label="Свободно"
          value={freeSlots === null ? "—" : String(freeSlots)}
        />
      </div>

      {error ? <p className="commandError">{error}</p> : null}

      <DashboardCard title="Подключенные устройства">
        {devices.length > 0 ? (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
              <Dialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    Удалить все
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Удалить все устройства</DialogTitle>
                    <DialogDescription>
                      Все привязанные устройства будут удалены. Это действие нельзя отменить.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="commandDialogActions">
                    <Button variant="destructive" disabled={pending} onClick={handleDeleteAll}>
                      {pending ? "Удаление..." : "Подтвердить удаление"}
                    </Button>
                    <Button variant="secondary" disabled={pending} onClick={() => setDeleteAllOpen(false)}>
                      Отмена
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <ul className="dashList">
              {devices.map((device) => (
                <DeviceRow
                  key={device.hwid}
                  device={device}
                  deleting={deletingHwid === device.hwid}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          </>
        ) : (
          <p>Нет подключённых устройств. Устройства появятся автоматически при подключении.</p>
        )}
      </DashboardCard>

      {devices.length === 0 ? (
        <DashboardCard title="Как подключить устройство">
          <ol className="dashList">
            {onboardingSteps.map((step, index) => (
              <li key={step.title} className="dashListItem is-not-completed">
                <div>
                  <strong>
                    {index + 1}. {step.title}
                  </strong>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </DashboardCard>
      ) : null}
    </div>
  );
}
