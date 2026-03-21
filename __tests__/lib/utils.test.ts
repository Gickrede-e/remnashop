import { describe, expect, it } from "vitest";

import {
  bytesToGb,
  formatBytes,
  formatCurrency,
  formatDateTime,
  gbToBytes,
  maskEmail,
  serializeBigInt,
  slugToRemnawaveTag,
  slugify
} from "@/lib/utils";

function normalizeCurrency(value: string) {
  return value.replace(/\u00A0/g, " ");
}

describe("lib/utils", () => {
  it("formats currency in rubles from kopecks", () => {
    expect(normalizeCurrency(formatCurrency(0))).toBe("0 ₽");
    expect(normalizeCurrency(formatCurrency(15000))).toBe("150 ₽");
    expect(normalizeCurrency(formatCurrency(-15000))).toBe("-150 ₽");
  });

  it("formats dates from Date objects and ISO strings", () => {
    const value = new Date("2024-01-02T03:04:05Z");
    const expected = new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(value);

    expect(formatDateTime(value)).toBe(expected);
    expect(formatDateTime(value.toISOString())).toBe(expected);
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
  });

  it("converts gigabytes to bytes", () => {
    expect(gbToBytes(1)).toBe(1073741824n);
    expect(gbToBytes(0)).toBe(0n);
    expect(gbToBytes(2048)).toBe(2199023255552n);
  });

  it("converts bytes back to gigabytes", () => {
    expect(bytesToGb(1073741824n)).toBe(1);
    expect(bytesToGb(2147483648)).toBe(2);
    expect(bytesToGb(null)).toBe(0);
  });

  it("formats bytes as gigabytes or terabytes", () => {
    expect(formatBytes(536870912000n)).toBe("500.0 ГБ");
    expect(formatBytes(1099511627776n)).toBe("1.00 ТБ");
    expect(formatBytes(null)).toBe("0.0 ГБ");
  });

  it("slugifies mixed inputs", () => {
    expect(slugify("Привет мир")).toBe("privet-mir");
    expect(slugify("Тариф !!! Pro++")).toBe("tarif-pro");
    expect(slugify("  --Привет--  ")).toBe("privet");
  });

  it("converts slugs to Remnawave tags", () => {
    expect(slugToRemnawaveTag("pro-plan")).toBe("PRO_PLAN");
    expect(slugToRemnawaveTag("mixed-Tag")).toBe("MIXED_TAG");
    expect(slugToRemnawaveTag("long-plan-name-123")).toBe("LONG_PLAN_NAME_1");
  });

  it("masks email names while keeping domains", () => {
    expect(maskEmail("test@mail.ru")).toBe("t**t@mail.ru");
    expect(maskEmail("ab@mail.ru")).toBe("a*@mail.ru");
    expect(maskEmail("a@mail.ru")).toBe("a*@mail.ru");
    expect(maskEmail("test@")).toBe("test@");
  });

  it("serializes bigint values recursively", () => {
    const serialized = serializeBigInt({
      count: 1n,
      nested: {
        value: 2n
      },
      list: [3n, { inner: 4n }]
    });

    expect(serialized).toEqual({
      count: "1",
      nested: {
        value: "2"
      },
      list: ["3", { inner: "4" }]
    });
  });
});
