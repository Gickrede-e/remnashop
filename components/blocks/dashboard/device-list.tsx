"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Copy, Laptop, Monitor, MonitorSmartphone, Smartphone, Tv } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { readApiEnvelope } from "@/lib/api-envelope";
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
  subscriptionUrl: string | null;
};

const COPIED_FEEDBACK_MS = 1500;
const QR_SIZE_PX = 176;
// The quiet zone the QR spec asks for; phone scanners misread codes that sit closer to other content.
const QR_QUIET_ZONE_MODULES = 4;

function PlatformIcon({ platform }: { platform: string | null }) {
  const normalized = platform?.toLowerCase() ?? "";
  if (normalized.includes("tv")) return <Tv className="iconMd" />;
  if (normalized.includes("ios") || normalized.includes("ipad") || normalized.includes("android")) {
    return <Smartphone className="iconMd" />;
  }
  if (normalized.includes("mac")) return <Laptop className="iconMd" />;
  if (normalized.includes("windows") || normalized.includes("linux")) return <Monitor className="iconMd" />;
  return <MonitorSmartphone className="iconMd" />;
}

function formatDeviceDate(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

function DeviceRow({
  device,
  isDeleting,
  onDelete
}: {
  device: Device;
  isDeleting: boolean;
  onDelete: (hwid: string) => void;
}) {
  const name = device.deviceModel ?? device.platform ?? "Неизвестное устройство";
  const addedAt = device.createdAt ? formatDeviceDate(device.createdAt) : null;
  const details = [
    [device.platform, device.osVersion].filter(Boolean).join(" "),
    addedAt ? `Добавлено ${addedAt}` : null
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="deviceRow">
      <span className="deviceRowIcon" aria-hidden="true">
        <PlatformIcon platform={device.platform} />
      </span>
      <span className="deviceRowText">
        <strong className="deviceRowName">{name}</strong>
        {details ? <span className="deviceRowMeta">{details}</span> : null}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={`Отключить ${name}`}
        disabled={isDeleting}
        onClick={() => onDelete(device.hwid)}
      >
        {isDeleting ? "Отключаем…" : "Отключить"}
      </Button>
    </li>
  );
}

export function DeviceList({ devices, total, deviceLimit, subscriptionUrl }: DeviceListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deletingHwid, setDeletingHwid] = useState<string | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  function handleDelete(hwid: string) {
    if (!window.confirm("Отключить это устройство?")) return;

    setError(null);
    setDeletingHwid(hwid);
    startTransition(async () => {
      try {
        const response = await fetch("/api/devices/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hwid })
        });
        const payload = await readApiEnvelope(response);

        if (!response.ok || !payload?.ok) {
          setError(payload?.error ?? "Не удалось отключить устройство");
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
        const payload = await readApiEnvelope(response);

        if (!response.ok || !payload?.ok) {
          setError(payload?.error ?? "Не удалось отключить устройства");
          return;
        }

        setDeleteAllOpen(false);
        router.refresh();
      } catch {
        setError("Не удалось выполнить запрос");
      }
    });
  }

  async function handleCopyLink() {
    if (!subscriptionUrl) return;

    try {
      await navigator.clipboard.writeText(subscriptionUrl);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      setError("Не удалось скопировать ссылку — откройте страницу подключения и скопируйте её там.");
    }
  }

  const cardTitle = deviceLimit === null ? `Подключено ${total}` : `Подключено ${total} из ${deviceLimit}`;

  return (
    <div className="dashWorkspace dashDevices">
      {error ? (
        <p className="commandError" role="alert">
          {error}
        </p>
      ) : null}

      <div className="devicesLayout">
        <section className="dashCard devicesCard" aria-labelledby="devices-title">
          {devices.length > 0 ? (
            <>
              <div className="dashCardHead">
                <h2 id="devices-title" className="dashCardTitle">
                  {cardTitle}
                </h2>
                <Dialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      Отключить все
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Отключить все устройства</DialogTitle>
                      <DialogDescription>
                        Все привязанные устройства будут отключены. Это действие нельзя отменить.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="commandDialogActions">
                      <Button variant="destructive" disabled={pending} onClick={handleDeleteAll}>
                        {pending ? "Отключаем..." : "Отключить все"}
                      </Button>
                      <Button variant="secondary" disabled={pending} onClick={() => setDeleteAllOpen(false)}>
                        Отмена
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <ul className="deviceRows">
                {devices.map((device) => (
                  <DeviceRow
                    key={device.hwid}
                    device={device}
                    isDeleting={deletingHwid === device.hwid}
                    onDelete={handleDelete}
                  />
                ))}
              </ul>
              <p className="dashHint">Одна ссылка работает на всех устройствах — просто вставьте её в Happ на новом.</p>
            </>
          ) : (
            <div className="devicesEmpty">
              <h2 id="devices-title" className="dashCardTitle">
                Устройств пока нет
              </h2>
              {subscriptionUrl ? (
                <>
                  <p className="dashHint">Инструкция по подключению — на странице подписки.</p>
                  <a href={subscriptionUrl} target="_blank" rel="noreferrer" className="devicesEmptyLink">
                    Как подключить устройство
                    <ArrowRight className="iconSm iconNoShrink" aria-hidden="true" />
                  </a>
                </>
              ) : (
                <>
                  <p className="dashHint">Оформите подписку — после оплаты здесь появятся подключённые устройства.</p>
                  <Link href="/dashboard/buy" className="devicesEmptyLink">
                    Купить подписку
                    <ArrowRight className="iconSm iconNoShrink" aria-hidden="true" />
                  </Link>
                </>
              )}
            </div>
          )}
        </section>

        {subscriptionUrl ? (
          <aside className="dashCard devicesAddCard" aria-labelledby="devices-add-title">
            <h2 id="devices-add-title" className="dashCardTitle">
              Добавить устройство
            </h2>
            <p className="dashHint">
              {deviceLimit
                ? `Одна ссылка работает на всех устройствах — до ${deviceLimit} одновременно.`
                : "Одна ссылка работает на всех устройствах."}
            </p>
            <figure className="devicesQr">
              <QRCodeSVG
                value={subscriptionUrl}
                size={QR_SIZE_PX}
                marginSize={QR_QUIET_ZONE_MODULES}
                title="QR-код ссылки подписки"
              />
              <figcaption className="devicesQrCaption">Отсканируйте код в Happ на телефоне.</figcaption>
            </figure>
            <button type="button" className="button buttonPrimary buttonSizeLg" onClick={handleCopyLink}>
              {isCopied ? (
                <Check className="iconSm iconNoShrink" aria-hidden="true" />
              ) : (
                <Copy className="iconSm iconNoShrink" aria-hidden="true" />
              )}
              <span aria-live="polite">{isCopied ? "Ссылка скопирована" : "Скопировать ссылку подписки"}</span>
            </button>
            <a
              href={subscriptionUrl}
              target="_blank"
              rel="noreferrer"
              className="button buttonSecondary buttonSizeLg"
            >
              Открыть страницу подключения
            </a>
            <p className="dashHint">Вставьте ссылку в Happ на новом устройстве или откройте страницу подключения прямо на нём.</p>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
