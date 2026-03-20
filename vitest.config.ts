import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const rootDir = path.resolve(fileURLToPath(new URL(".", import.meta.url)));

export default defineConfig({
  resolve: {
    alias: {
      "@": rootDir
    }
  },
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    alias: {
      "server-only": path.resolve(rootDir, "__mocks__/server-only.ts"),
      "@prisma/client": path.resolve(rootDir, "__mocks__/@prisma/client.ts")
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"]
    }
  }
});
