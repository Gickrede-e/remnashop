import { describe, expect, it } from "vitest";

import { AppError } from "@/lib/http/errors";
import { fail } from "@/lib/http/response";
import { runWithLoggerContext } from "@/lib/server/logger-context";

describe("lib/http/response", () => {
  it("reuses the ALS request id as correlation id", async () => {
    const response = runWithLoggerContext({ requestId: "req-fail-1" }, () =>
      fail(
        new AppError({
          code: "LOGIN_FAILED",
          message: "boom",
          status: 418
        })
      )
    );

    expect(response.status).toBe(418);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "LOGIN_FAILED",
        message: "boom",
        fieldErrors: undefined,
        retryable: undefined,
        correlationId: "req-fail-1"
      }
    });
  });
});
