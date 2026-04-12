FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps-dev
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS deps-prod
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

FROM deps-dev AS prisma-cli
RUN node - <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const sourceRoot = "/app/node_modules";
const outputRoot = "/prisma-cli/node_modules";
const seen = new Set();

function resolvePackageJson(name, fromDir) {
  const parts = name.split("/");
  let currentDir = fromDir;

  while (true) {
    const candidateDir = path.join(currentDir, "node_modules", ...parts);
    const candidatePackageJson = path.join(candidateDir, "package.json");
    if (fs.existsSync(candidatePackageJson)) {
      return candidatePackageJson;
    }

    const nextDir = path.dirname(currentDir);
    if (nextDir === currentDir) {
      break;
    }
    currentDir = nextDir;
  }

  const rootPackageJson = path.join(sourceRoot, ...parts, "package.json");
  if (fs.existsSync(rootPackageJson)) {
    return rootPackageJson;
  }

  throw new Error(`Could not resolve package root for ${name}`);
}

function copyPackage(name, fromDir) {
  const packageJsonPath = resolvePackageJson(name, fromDir);
  const sourceDir = path.dirname(packageJsonPath);
  const relativeDir = path.relative(sourceRoot, sourceDir);

  if (seen.has(relativeDir)) {
    return;
  }
  seen.add(relativeDir);

  const outputDir = path.join(outputRoot, relativeDir);
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  fs.mkdirSync(path.dirname(outputDir), { recursive: true });
  fs.cpSync(sourceDir, outputDir, { recursive: true });

  const deps = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.optionalDependencies ?? {})
  };

  for (const dependency of Object.keys(deps)) {
    copyPackage(dependency, sourceDir);
  }
}

copyPackage("prisma", sourceRoot);
NODE

FROM deps-dev AS build
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SITE_NAME
ARG NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_PUBLIC_SITE_NAME=${NEXT_PUBLIC_SITE_NAME}
ENV NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=${NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}
COPY . .
RUN mkdir -p public
RUN --mount=type=secret,id=build_env \
    node -e "const fs=require('node:fs'); const {spawnSync}=require('node:child_process'); const env={...process.env}; for (const rawLine of fs.readFileSync('/run/secrets/build_env','utf8').split(/\r?\n/)) { const line=rawLine.trim(); if (!line || line.startsWith('#')) continue; const eq=line.indexOf('='); if (eq < 0) continue; const key=line.slice(0, eq).trim(); let value=rawLine.slice(eq + 1); if ((value.startsWith('\"') && value.endsWith('\"')) || (value.startsWith(\"'\") && value.endsWith(\"'\"))) value=value.slice(1, -1); env[key]=value; } const result=spawnSync('npm',['run','build'],{stdio:'inherit',env}); process.exit(result.status ?? 1)"

FROM base AS runner
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --chown=nextjs:nodejs --from=build /app/.next-local/standalone ./
COPY --chown=nextjs:nodejs --from=build /app/.next-local/static ./.next-local/static
COPY --chown=nextjs:nodejs --from=build /app/public ./public
COPY --chown=nextjs:nodejs --from=build /app/prisma ./prisma
COPY --chown=nextjs:nodejs --from=build /app/prisma.config.mjs ./prisma.config.mjs
COPY --chown=nextjs:nodejs --from=prisma-cli /prisma-cli ./prisma-cli
COPY --chown=nextjs:nodejs --from=build /app/scripts/worker.mjs ./scripts/worker.mjs
COPY --chown=nextjs:nodejs --from=build /app/scripts/worker-logger.mjs ./scripts/worker-logger.mjs
COPY --chown=nextjs:nodejs --from=build /app/scripts/worker-runtime.mjs ./scripts/worker-runtime.mjs
COPY --chown=nextjs:nodejs --from=build /app/scripts/migrate-and-seed.sh ./scripts/migrate-and-seed.sh
RUN chmod +x scripts/migrate-and-seed.sh
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
