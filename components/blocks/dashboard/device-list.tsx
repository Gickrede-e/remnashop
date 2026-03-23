"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

function getPlatformIcon(platform: string | null) {
  if (!platform) return "📟";
  const p = platform.toLowerCase();
  if (p.includes("ios") || p.includes("android")) return "📱";
  if (p.includes("mac")) return "🖥";
  if (p.includes("linux")) return "🐧";
  if (p.includes("windows")) return "💻";
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

function DeviceCard({ device, onDelete, deleting }: { device: Device; onDelete: (hwid: string) => void; deleting: boolean }) {
  const model = device.deviceModel ?? device.platform ?? "Неизвестное устройство";
  const details = [device.platform, device.osVersion, device.createdAt ? `Добавлено ${formatDeviceDate(device.createdAt)}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">
            {getPlatformIcon(device.platform)} {model}
          </p>
          {details ? (
            <p className="mt-1 truncate text-xs text-zinc-400">{details}</p>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={deleting}
          className="shrink-0 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
          onClick={() => onDelete(device.hwid)}
        >
          {deleting ? "..." : "Удалить"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function DeviceList({ devices, total, deviceLimit }: DeviceListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deletingHwid, setDeletingHwid] = useState<string | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (devices.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-zinc-400">
          Нет подключённых устройств. Устройства появятся автоматически при подключении.
        </CardContent>
      </Card>
    );
  }

  const counter = deviceLimit
    ? `${total} из ${deviceLimit} устройств`
    : `${total} устройств`;

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white">{counter}</p>
        <Dialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
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
            <div className="grid gap-3 pt-2">
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

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="grid gap-2">
        {devices.map((device) => (
          <DeviceCard
            key={device.hwid}
            device={device}
            onDelete={handleDelete}
            deleting={deletingHwid === device.hwid}
          />
        ))}
      </div>
    </div>
  );
}
