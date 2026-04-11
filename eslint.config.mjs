import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      "no-console": "error"
    }
  },
  {
    files: [
      "lib/env.ts",
      "prisma/seed.mjs",
      "scripts/worker-logger.mjs"
    ],
    rules: {
      "no-console": "off"
    }
  },
  globalIgnores([
    ".next/**",
    ".next-local/**",
    ".next.stale*/**",
    ".next-local.stale*/**",
    "out/**",
    "build/**",
    "coverage/**",
    ".worktrees/**",
    "next-env.d.ts",
    "artifacts/**"
  ])
]);
