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
import { buttonVariants } from "@/components/ui/button";

const dialogPath = path.resolve(process.cwd(), "components/ui/dialog.tsx");
const tailwindConfigPath = path.resolve(process.cwd(), "tailwind.config.mjs");

describe("mobile visual primitives", () => {
  it("keeps the default button variant free of heavy glow shadows", () => {
    expect(buttonVariants({ variant: "default" })).not.toContain("shadow-glow");
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
});
