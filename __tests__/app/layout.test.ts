import fs from "node:fs";
import path from "node:path";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

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
    expect(markup).toMatch(/<body[^>]*class="[^"]*\bappBody\b[^"]*"/);
    expect(markup).toContain('data-testid="app-root"');
    expect(markup).toMatch(/class="[^"]*\bappRoot\b[^"]*"/);
  });

  it("defines the root foundation in plain CSS without Tailwind directives", () => {
    const source = fs.readFileSync(globalsCssPath, "utf8");

    expect(source).toContain(":root");
    expect(source).toContain(".appBody");
    expect(source).toContain(".appRoot");
    expect(source).not.toContain('@config "../tailwind.config.mjs";');
    expect(source).not.toContain('@import "tailwindcss";');
    expect(source).not.toContain("@apply");
  });
});
