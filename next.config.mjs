import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));

// Security headers set at the application layer so they travel with the app
// regardless of reverse-proxy topology. Caddy sets these too in the reference
// deploy; duplicating them here means a deployment that fronts Next.js
// differently (a PaaS, k8s ingress, no Caddy) doesn't silently lose them. CSP
// stays in proxy.ts (it needs the per-request nonce). Applied to every route
// including /api (unlike the CSP, which the middleware matcher skips).
const securityHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload"
  }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: ".next-local",
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "bcryptjs", "jose", "nodemailer", "pg"],
  outputFileTracingIncludes: {
    "/**": ["./node_modules/.prisma/**/*", "./node_modules/@prisma/engines/**/*"]
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    root: rootDir
  }
};

export default nextConfig;
