import { describe, expect, it } from "vitest";

import { AppError, toAppError } from "@/lib/http/errors";

describe("lib/http/errors", () => {
  it("returns AppError instances as-is", () => {
    const error = new AppError({
      code: "AUTH_REQUIRED",
      message: "Login required",
      status: 401
    });

    expect(toAppError(error)).toBe(error);
  });

  it("converts generic Error instances into INTERNAL_ERROR", () => {
    expect(toAppError(new Error("boom"))).toEqual(
      expect.objectContaining({
        name: "AppError",
        code: "INTERNAL_ERROR",
        message: "boom",
        status: 500
      })
    );
  });

  it("converts unknown values into a generic INTERNAL_ERROR", () => {
    expect(toAppError("boom")).toEqual(
      expect.objectContaining({
        name: "AppError",
        code: "INTERNAL_ERROR",
        message: "Unexpected error",
        status: 500
      })
    );
  });

  it("does not trust message-like fields on non-Error objects", () => {
    expect(toAppError({ message: "spoofed" })).toEqual(
      expect.objectContaining({
        code: "INTERNAL_ERROR",
        message: "Unexpected error",
        status: 500
      })
    );
  });
});
