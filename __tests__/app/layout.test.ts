import fs from "node:fs";
import path from "node:path";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Inter: () => ({
    variable: "font-sans-mock"
  }),
  JetBrains_Mono: () => ({
    variable: "font-mono-mock"
  })
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-nonce": "test-nonce" })
}));

import RootLayout, { metadata } from "@/app/layout";

const globalsCssPath = path.resolve(process.cwd(), "app/globals.css");

describe("root layout foundation", () => {
  it("disables search indexing and uses a neutral site description", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(JSON.stringify(metadata)).not.toMatch(/vpn|впн/i);
  });

  it("renders the application root hooks for the plain CSS foundation", async () => {
    const tree = await RootLayout({
      children: React.createElement("div", null, "Screen body")
    } as Parameters<typeof RootLayout>[0]);
    const markup = renderToStaticMarkup(tree);

    expect(markup).toContain("Screen body");
    expect(markup).toMatch(/<html[^>]*class="[^"]*\bdark\b[^"]*"/);
    expect(markup).toMatch(/<html[^>]*class="[^"]*\bfont-sans-mock\b[^"]*"/);
    expect(markup).toMatch(/<body[^>]*class="[^"]*\bappBody\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bappRoot\b[^"]*"/);
    expect(markup).not.toContain('data-testid="app-root"');
    expect(markup).not.toContain("<main><div>Screen body</div></main>");
  });

  it("defines the root foundation without the Tailwind bridge", () => {
    const source = fs.readFileSync(globalsCssPath, "utf8");

    expect(source).toContain(":root");
    expect(source).toContain("body.appBody");
    expect(source).toContain(".appRoot");
    expect(source).toContain("--canvas-0: #090909");
    expect(source).toContain("--canvas-1: #121212");
    expect(source).toContain("--text-primary: #f3efe6");
    expect(source).toContain("--accent-primary: #66e08a");
    expect(source).toContain("--accent-ambient: rgba(var(--gick-accent-rgb), 0.10)");
    expect(source).toContain("--radius: 1rem");
    expect(source).toContain(".container");
    expect(source).toContain(".sr-only");
    expect(source).not.toContain('tailwindcss');
    expect(source).not.toContain('tailwind.config.mjs');
    expect(source).toContain(".dashSidebar");
    expect(source).toContain(".authCard");
    expect(source).toContain(".page-surface");
    expect(source).toContain("@media (prefers-reduced-motion: reduce)");
    expect(source).toContain(".dashShellMain");
    expect(source).toContain(".screenHeaderTitle");
    expect(source).toContain("text-wrap: balance");
  });
});
