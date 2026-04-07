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
    expect(markup).toMatch(/class="[^"]*\bappRoot\b[^"]*"/);
    expect(markup).not.toContain('data-testid="app-root"');
  });

  it("defines the root foundation while keeping the temporary Tailwind bridge", () => {
    const source = fs.readFileSync(globalsCssPath, "utf8");

    expect(source).toContain(":root");
    expect(source).toContain("body.appBody");
    expect(source).toContain(".appRoot");
    expect(source).toContain('--app-bg');
    expect(source).toContain('@import "tailwindcss";');
  });
});
