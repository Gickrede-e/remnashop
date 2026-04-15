import { describe, expect, it, vi } from "vitest";

const { mockRandomUUID } = vi.hoisted(() => ({
  mockRandomUUID: vi.fn(() => "generated-correlation-id")
}));

vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return {
    ...actual,
    randomUUID: mockRandomUUID
  };
});

import { AppError } from "@/lib/http/errors";
import { created, fail, ok, withRouteHandler } from "@/lib/http/response";

describe("lib/http/response helpers", () => {
  it("returns a successful JSON response", async () => {
    const response = ok({ value: 1 }, { page: 2 });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: { value: 1 },
      meta: { page: 2 }
    });
  });

  it("returns a created JSON response with 201 status", async () => {
    const response = created({ id: "resource-1" });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: { id: "resource-1" },
      meta: undefined
    });
  });

  it("generates a correlation id when ALS context is absent", async () => {
    const response = fail(
      new AppError({
        code: "VALIDATION_FAILED",
        message: "Broken input",
        status: 422,
        fieldErrors: {
          email: ["required"]
        },
        retryable: false
      })
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "VALIDATION_FAILED",
        message: "Broken input",
        fieldErrors: {
          email: ["required"]
        },
        retryable: false,
        correlationId: "generated-correlation-id"
      }
    });
    expect(mockRandomUUID).toHaveBeenCalledTimes(1);
  });

  it("passes through successful route handler results", async () => {
    const response = await withRouteHandler(async () => ok({ healthy: true }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: { healthy: true },
      meta: undefined
    });
  });

  it("converts thrown errors into failed route responses", async () => {
    const response = await withRouteHandler(async () => {
      throw new Error("unexpected crash");
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "unexpected crash",
        fieldErrors: undefined,
        retryable: undefined,
        correlationId: "generated-correlation-id"
      }
    });
  });
});
