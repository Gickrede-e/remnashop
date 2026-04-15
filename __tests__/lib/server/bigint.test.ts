import { describe, expect, it } from "vitest";

import { serializeBigInts, toNumber } from "@/lib/server/bigint";

describe("lib/server/bigint", () => {
  it("converts bigint values to numbers and preserves primitive inputs", () => {
    expect(toNumber(42n)).toBe(42);
    expect(toNumber(7)).toBe(7);
    expect(toNumber(null)).toBeNull();
    expect(toNumber(undefined)).toBeNull();
  });

  it("serializes nested bigint values to strings", () => {
    expect(
      serializeBigInts({
        total: 12n,
        nested: {
          current: 3n
        },
        list: [1n, { value: 2n }]
      })
    ).toEqual({
      total: "12",
      nested: {
        current: "3"
      },
      list: ["1", { value: "2" }]
    });
  });
});
