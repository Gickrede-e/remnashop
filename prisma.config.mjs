let prismaConfigModule;

try {
  prismaConfigModule = await import("prisma/config");
} catch {
  prismaConfigModule = await import("./prisma-cli/node_modules/prisma/config.js");
}

const { defineConfig, env } = prismaConfigModule;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node --env-file=.env prisma/seed.mjs"
  },
  datasource: {
    url: env("DATABASE_URL")
  }
});
