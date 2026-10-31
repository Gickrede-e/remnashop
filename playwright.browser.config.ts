import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "turnstile-lifecycle.spec.ts",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    browserName: "chromium",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : undefined,
    ...devices["Desktop Chrome"]
  }
});
