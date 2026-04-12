import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Dockerfile worker runtime packaging", () => {
  it("copies worker-runtime.mjs into the runner image", () => {
    const dockerfile = readFileSync(path.join(process.cwd(), "Dockerfile"), "utf8");

    expect(dockerfile).toContain("/app/scripts/worker-runtime.mjs ./scripts/worker-runtime.mjs");
  });
});
