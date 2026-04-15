import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Dockerfile worker runtime packaging", () => {
  it("copies worker-runtime.mjs into the runner image", () => {
    const dockerfile = readFileSync(path.join(process.cwd(), "Dockerfile"), "utf8");

    expect(dockerfile).toContain("/app/scripts/worker-runtime.mjs ./scripts/worker-runtime.mjs");
  });

  it("caches npm installs in dependency stages and skips audit noise", () => {
    const dockerfile = readFileSync(path.join(process.cwd(), "Dockerfile"), "utf8");

    expect(dockerfile).toContain("RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund");
    expect(dockerfile).toContain(
      "RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --ignore-scripts --no-audit --no-fund"
    );
  });
});
