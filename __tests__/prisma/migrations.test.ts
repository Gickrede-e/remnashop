import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const migrationsDir = path.join(repoRoot, "prisma", "migrations");

describe("prisma/migrations", () => {
  it("commits the migration baseline and removes db push fallbacks", async () => {
    const migrationEntries = await readdir(migrationsDir, { withFileTypes: true });
    const migrationDirs = migrationEntries.filter((entry) => entry.isDirectory());

    expect(migrationDirs.length).toBeGreaterThan(0);

    await expect(readFile(path.join(migrationsDir, "migration_lock.toml"), "utf8")).resolves.toContain(
      'provider = "postgresql"'
    );
    await expect(readFile(path.join(repoRoot, "Dockerfile"), "utf8")).resolves.not.toMatch(/prisma db push/);
    await expect(readFile(path.join(repoRoot, "docker-compose.yml"), "utf8")).resolves.not.toMatch(
      /prisma db push/
    );
  });
});
