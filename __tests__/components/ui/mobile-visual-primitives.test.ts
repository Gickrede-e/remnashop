import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children)
}));

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

describe("mobile visual primitives", () => {
  it("renders the primary button with semantic button classes", () => {
    const markup = renderToStaticMarkup(React.createElement(Button, { variant: "default" }, "Primary"));

    expect(markup).toContain("Primary");
    expect(markup).toMatch(/\bbutton\b/);
    expect(markup).toMatch(/\bbuttonPrimary\b/);
  });

  it("renders the input with a semantic input class", () => {
    const markup = renderToStaticMarkup(React.createElement(Input, { "aria-label": "Search" }));

    expect(markup).toMatch(/\binput\b/);
  });

  it("renders the separator with a semantic separator class", () => {
    const markup = renderToStaticMarkup(React.createElement(Separator));

    expect(markup).toMatch(/\bseparator\b/);
  });
});
