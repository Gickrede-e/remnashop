import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const globalsCssPath = path.resolve(process.cwd(), "app/globals.css");

function readCss() {
  return fs.readFileSync(globalsCssPath, "utf8");
}

function extractRule(source: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `(^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`,
    "m"
  );
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`CSS rule for ${selector} not found`);
  }
  return match[2];
}

describe("dashboard shell layout", () => {
  it("places dashShellMain into the second grid column without margin hacks", () => {
    const rule = extractRule(readCss(), ".dashShellMain");

    expect(rule).toContain("grid-column: 2");
    expect(rule).not.toContain("margin-left:");
  });

  it("keeps dashSidebar in the grid flow as a sticky flex column", () => {
    const rule = extractRule(readCss(), ".dashSidebar");

    expect(rule).toContain("position: sticky");
    expect(rule).not.toContain("position: fixed");
    expect(rule).toContain("grid-column: 1");
    expect(rule).toContain("display: flex");
    expect(rule).toContain("flex-direction: column");
    expect(rule).not.toContain("grid-template-rows:");
  });

  it("pins the sidebar footer to the bottom via margin-top auto", () => {
    const rule = extractRule(readCss(), ".dashSidebarFooter");

    expect(rule).toContain("margin-top: auto");
    expect(rule).toContain("display: flex");
    expect(rule).toContain("flex-direction: column");
  });

  it("locks the sidebar CTA height so it cannot stretch into a circle", () => {
    const rule = extractRule(readCss(), ".dashSidebarCta");

    expect(rule).toContain("flex: 0 0 auto");
    expect(rule).toContain("min-height: 2.6rem");
  });

  it("collapses the dashboard shell to a single column on narrow viewports", () => {
    const source = readCss();
    const mobileBlockMatch = source.match(
      /@media\s*\(max-width:\s*768px\)\s*\{([\s\S]*?)\n\s{2}\}/
    );
    expect(mobileBlockMatch, "expected the existing 768px media block").not.toBeNull();
    const mobile = mobileBlockMatch![1];

    expect(mobile).toContain(".dashShell");
    expect(mobile).toContain("grid-template-columns: 1fr");
    expect(mobile).toContain(".dashShellMain");
    expect(mobile).toContain("grid-column: 1");
    expect(mobile).toContain(".dashSidebar");
    expect(mobile).toContain("position: static");
    expect(mobile).toContain(".dashSidebarFooter");
    expect(mobile).toContain("margin-top: 0");
  });
});
