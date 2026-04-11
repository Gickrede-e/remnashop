import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: ".next-local",
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "bcryptjs", "jose", "nodemailer", "pg"],
  outputFileTracingIncludes: {
    "/**": ["./node_modules/.prisma/**/*", "./node_modules/@prisma/engines/**/*"]
  },
  turbopack: {
    root: rootDir
  }
};

export default nextConfig;
