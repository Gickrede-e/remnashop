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
  getRemnawaveUserByUsername,
  isRemnawaveNotFoundError
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
});
