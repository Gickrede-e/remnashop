FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
ARG DATABASE_URL=postgresql://postgres:postgres@postgres:5432/gickvpn?schema=public
ENV DATABASE_URL=${DATABASE_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS tools
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
CMD ["sh", "-c", "npx prisma generate && if [ -d prisma/migrations ] && [ \"$(ls -A prisma/migrations 2>/dev/null)\" ]; then npx prisma migrate deploy; else npx prisma db push; fi && npm run db:seed"]

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
RUN apk add --no-cache libc6-compat openssl && addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next-local/standalone ./
COPY --from=build /app/.next-local/static ./.next-local/static
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/scripts/worker.mjs ./scripts/worker.mjs
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
