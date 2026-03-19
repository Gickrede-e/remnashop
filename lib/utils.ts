import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amountInKopecks: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0
  }).format(amountInKopecks / 100);
}

export const formatPrice = formatCurrency;

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function gbToBytes(trafficGb: number) {
  return BigInt(trafficGb) * 1024n * 1024n * 1024n;
}

export const bytesFromGb = gbToBytes;

export function bytesToGb(value: bigint | number | null | undefined) {
  if (value == null) {
    return 0;
  }

  const bytes = typeof value === "bigint" ? Number(value) : value;
  return bytes / 1024 / 1024 / 1024;
}

export const gbFromBytes = bytesToGb;

export function formatBytes(value: bigint | number | null | undefined) {
  const amount = bytesToGb(value);
  if (amount >= 1024) {
    return `${(amount / 1024).toFixed(2)} ТБ`;
  }

  return `${amount.toFixed(1)} ГБ`;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яё\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!name || !domain) {
    return email;
  }

  if (name.length <= 2) {
    return `${name[0] ?? "*"}*@${domain}`;
  }

  return `${name[0]}${"*".repeat(Math.max(1, name.length - 2))}${name[name.length - 1]}@${domain}`;
}

export function serializeBigInt<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_, nestedValue) =>
      typeof nestedValue === "bigint" ? nestedValue.toString() : nestedValue
    )
  ) as T;
}
