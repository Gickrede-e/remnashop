import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Caddyfile security headers", () => {
  it("enforces CSP instead of running it in report-only mode", () => {
    const caddyfile = readFileSync(path.join(process.cwd(), "Caddyfile"), "utf8");

    expect(caddyfile).toContain('Content-Security-Policy "');
    expect(caddyfile).not.toContain("Content-Security-Policy-Report-Only");
  });
});
