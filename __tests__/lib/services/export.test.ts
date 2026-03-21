import { describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {}
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma
}));

import { escapeCsvValue, rowsToCsv } from "@/lib/services/export";

describe("CSV helpers", () => {
  it("wraps values with commas in quotes", () => {
    expect(escapeCsvValue("one,two")).toBe("\"one,two\"");
  });

  it("escapes quotes inside values", () => {
    expect(escapeCsvValue("say \"hello\"")).toBe("\"say \"\"hello\"\"\"");
  });

  it("returns only BOM for an empty export", () => {
    expect(rowsToCsv([])).toBe("\uFEFF");
  });

  it("serializes rows with headers", () => {
    expect(rowsToCsv([
      {
        email: "user@example.com",
        note: "hello,world"
      }
    ])).toBe("\uFEFFemail,note\nuser@example.com,\"hello,world\"");
  });
});
