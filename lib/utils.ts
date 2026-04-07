type ClassDictionary = Record<string, boolean | null | undefined>;
type ClassValue = string | number | false | null | undefined | ClassDictionary | ClassValue[];

export function cn(...inputs: ClassValue[]) {
  const classes: string[] = [];

  const append = (value: ClassValue) => {
    if (!value) {
      return;
    }

    if (typeof value === "string" || typeof value === "number") {
      const token = String(value).trim();
      if (token) {
        classes.push(token);
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(append);
      return;
    }

    Object.entries(value).forEach(([token, enabled]) => {
      if (enabled && token.trim()) {
        classes.push(token);
      }
    });
  };

  inputs.forEach(append);

  return classes.join(" ");
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
  const transliterationMap: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya"
  };

  const latin = input
    .toLowerCase()
    .split("")
    .map((symbol) => transliterationMap[symbol] ?? symbol)
    .join("");

  return latin
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugToRemnawaveTag(slug: string) {
  return slug
    .trim()
    .replace(/-/g, "_")
    .replace(/[^A-Za-z0-9_]/g, "")
    .toUpperCase()
    .slice(0, 16);
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
