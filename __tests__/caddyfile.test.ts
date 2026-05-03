import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Caddyfile security headers", () => {
  const caddyfile = readFileSync(path.join(process.cwd(), "Caddyfile"), "utf8");

  it("declares trusted_proxies for X-Forwarded-* hardening", () => {
    expect(caddyfile).toMatch(/trusted_proxies\s+static\s+private_ranges/);
  });

  it("enforces hardened HSTS with includeSubDomains and preload", () => {
    expect(caddyfile).toMatch(
      /Strict-Transport-Security\s+"max-age=63072000;\s*includeSubDomains;\s*preload"/
    );
  });

  it("delegates Content-Security-Policy to Next.js middleware (no Caddy-side CSP)", () => {
    expect(caddyfile).not.toMatch(/Content-Security-Policy(?!-)/);
    expect(caddyfile).not.toContain("Content-Security-Policy-Report-Only");
  });

  it("strips the Server identification header", () => {
    expect(caddyfile).toMatch(/-Server/);
  });

  it("propagates the real client IP to upstream", () => {
    expect(caddyfile).toMatch(/header_up\s+X-Real-IP\s+\{remote_host\}/);
  });
});
