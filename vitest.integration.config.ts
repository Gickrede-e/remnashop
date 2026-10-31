import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const rootDir = path.resolve(fileURLToPath(new URL(".", import.meta.url)));
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error("TEST_DATABASE_URL is required for integration tests");
const database = new URL(testDatabaseUrl);
if (!/^postgres(?:ql)?:$/.test(database.protocol) || !/test/i.test(database.pathname) || /prod/i.test(database.pathname)) {
  throw new Error("TEST_DATABASE_URL must point to a PostgreSQL test database");
}

export default defineConfig({
  envDir: false,
  resolve: { alias: { "@": rootDir } },
  test: {
    environment: "node",
    include: ["__tests__/integration/**/*.test.ts"],
    testTimeout: 15_000,
    hookTimeout: 15_000,
    env: {
      DATABASE_URL: testDatabaseUrl,
      REFERRAL_REWARD_TYPE: "FREE_DAYS",
      REFERRAL_REWARD_VALUE: "3"
    },
    alias: { "server-only": path.resolve(rootDir, "__mocks__/server-only.ts") }
  }
});
