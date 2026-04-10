import fs from "node:fs";
import path from "node:path";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  JetBrains_Mono: () => ({
    variable: "font-mono-mock"
  })
}));

import RootLayout from "@/app/layout";

const globalsCssPath = path.resolve(process.cwd(), "app/globals.css");

describe("root layout foundation", () => {
  it("renders the application root hooks for the plain CSS foundation", () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        RootLayout,
        null,
        React.createElement("div", null, "Screen body")
      )
    );

    expect(markup).toContain("Screen body");
    expect(markup).toMatch(/<html[^>]*class="[^"]*\bdark\b[^"]*"/);
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
    expect(source).toContain("--accent-primary: #d6ff3f");
    expect(source).toContain("--accent-ambient: rgba(124, 92, 255, 0.18)");
    expect(source).toContain("--radius: 1rem");
    expect(source).toContain(".container");
    expect(source).toContain(".sr-only");
    expect(source).not.toContain('tailwindcss');
    expect(source).not.toContain('tailwind.config.mjs');
    expect(source).toContain(".appNavRail");
    expect(source).toContain(".authCard");
    expect(source).toContain(".page-surface");
    expect(source).toContain("@media (prefers-reduced-motion: reduce)");
    expect(source).toContain("overscroll-behavior: contain");
    expect(source).toContain(".screenHeaderTitle");
    expect(source).toContain("text-wrap: balance");
  });
});
