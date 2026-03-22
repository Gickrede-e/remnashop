import { afterEach, describe, expect, it, vi } from "vitest";

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    REMNAWAVE_BASE_URL: "https://panel.example.com",
    REMNAWAVE_API_TOKEN: "real-token"
  }
}));

vi.mock("@/lib/env", () => ({
  env: mockEnv
}));

import {
  createRemnawaveUser,
  getRemnawaveUser,
  getRemnawaveUserByUsername,
  isRemnawaveRecoverableIdentityError,
  isRemnawaveNotFoundError,
  updateRemnawaveUser
} from "@/lib/services/remnawave";

describe("remnawave service", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("classifies a plain-text 404 username lookup as not found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("User not found", { status: 404 }))
    );

    const error = await getRemnawaveUserByUsername("gs_alice").catch(
      (caughtError: unknown) => caughtError
    );

    expect(error).toBeInstanceOf(Error);
    expect(isRemnawaveNotFoundError(error)).toBe(true);
  });

  it("classifies invalid uuid lookups as recoverable stale identity errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({
        statusCode: 400,
        message: "Validation failed",
        errors: [
          {
            validation: "uuid",
            code: "invalid_string",
            message: "Invalid uuid",
            path: ["uuid"]
          }
        ]
      }), { status: 400 }))
    );

    const error = await getRemnawaveUser("stale-live-link").catch(
      (caughtError: unknown) => caughtError
    );

    expect(error).toBeInstanceOf(Error);
    expect(isRemnawaveRecoverableIdentityError(error)).toBe(true);
  });

  it("omits a null hwidDeviceLimit from create payloads", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      response: {
        uuid: "rw-1",
        username: "gs_alice",
        shortUuid: "short-1"
      }
    }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await createRemnawaveUser({
      username: "gs_alice",
      expireAt: "2026-04-30T00:00:00.000Z",
      status: "ACTIVE",
      hwidDeviceLimit: null
    });

    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit | undefined]>;
    const init = calls[0]?.[1];
    const body = typeof init?.body === "string" ? JSON.parse(init.body) as Record<string, unknown> : {};

    expect(body).not.toHaveProperty("hwidDeviceLimit");
  });

  it("omits a null hwidDeviceLimit from update payloads", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      response: {
        uuid: "rw-1",
        username: "gs_alice",
        shortUuid: "short-1"
      }
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await updateRemnawaveUser("rw-1", {
      status: "ACTIVE",
      hwidDeviceLimit: null
    });

    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit | undefined]>;
    const init = calls[0]?.[1];
    const body = typeof init?.body === "string" ? JSON.parse(init.body) as Record<string, unknown> : {};

    expect(body).not.toHaveProperty("hwidDeviceLimit");
  });
});
