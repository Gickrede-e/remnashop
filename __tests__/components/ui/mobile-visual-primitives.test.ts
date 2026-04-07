import fs from "node:fs";
import path from "node:path";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children)
}));

import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";

const dialogPath = path.resolve(process.cwd(), "components/ui/dialog.tsx");
const tailwindConfigPath = path.resolve(process.cwd(), "tailwind.config.mjs");
const globalsCssPath = path.resolve(process.cwd(), "app/globals.css");

describe("mobile visual primitives", () => {
  it("keeps the default button variant free of heavy glow shadows", () => {
    expect(buttonVariants({ variant: "default" })).not.toContain("shadow-glow");
  });

  it("renders the primary button with semantic button classes", () => {
    const markup = renderToStaticMarkup(React.createElement(Button, { variant: "default" }, "Primary"));

    expect(markup).toContain("Primary");
    expect(markup).toMatch(/class="[^"]*\bbutton\b[^"]*"/);
    expect(markup).toMatch(/class="[^"]*\bbuttonPrimary\b[^"]*"/);
  });

  it("preserves caller utility overrides through the primitive layer", () => {
    const markup = renderToStaticMarkup(
      React.createElement(Button, { className: "w-full justify-between" }, "Primary")
    );
    const css = fs.readFileSync(globalsCssPath, "utf8");

    expect(markup).toMatch(/class="[^"]*\bbutton\b[^"]*\bw-full\b[^"]*\bjustify-between\b[^"]*"/);
    expect(css).toMatch(/@layer components\s*\{[\s\S]*\.button\s*\{/);
  });

  it("renders the input with a semantic input class", () => {
    const markup = renderToStaticMarkup(React.createElement(Input, { "aria-label": "Search" }));

    expect(markup).toMatch(/class="[^"]*\binput\b[^"]*"/);
  });

  it("renders the separator with a semantic separator class", () => {
    const markup = renderToStaticMarkup(React.createElement(Separator));

    expect(markup).toMatch(/class="[^"]*\bseparator\b[^"]*"/);
  });

  it("renders the shared logo without the old glow shadow", () => {
    const markup = renderToStaticMarkup(React.createElement(Logo));

    expect(markup).not.toContain("shadow-glow");
  });

  it("keeps dialog surfaces free of blur-heavy glow classes", () => {
    const source = fs.readFileSync(dialogPath, "utf8");

    expect(source).not.toContain("backdrop-blur-sm");
    expect(source).not.toContain("shadow-glow");
  });

  it("does not keep the old 16px/48px glow token in tailwind config", () => {
    const source = fs.readFileSync(tailwindConfigPath, "utf8");

    expect(source).not.toContain("0 16px 48px");
  });

  it("defines CSS for semantic hooks emitted by select and dropdown primitives", () => {
    const source = fs.readFileSync(globalsCssPath, "utf8");

    expect(source).toContain(".selectContent");
    expect(source).toContain(".selectItemText");
    expect(source).toContain(".dropdownMenuItem");
  });
});
