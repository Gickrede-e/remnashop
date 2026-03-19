# Repository Guidelines

## Project Structure & Module Organization
`app/` contains the Next.js App Router pages, layouts, and route handlers under `app/api/*`. Reusable UI lives in `components/`, with `components/ui/` for shared primitives, `components/admin/` for admin screens, and `components/dashboard/` for user dashboard widgets. Business logic belongs in `lib/services/`; request validation is split into `lib/validators/` and `lib/schemas/`. Database schema and seed data live in `prisma/`. Deployment files are in the repo root: `Dockerfile`, `docker-compose.yml`, `docker-compose.hub.yml`, and `Caddyfile`.

## Build, Test, and Development Commands
- `npm install` installs dependencies.
- `npm run dev` starts the local Next.js dev server.
- `npm run build` runs `prisma generate` and builds the production app.
- `npm run start` serves the production build locally.
- `npm run lint` runs ESLint with Next.js core-web-vitals rules.
- `npx tsc --noEmit` is the required type-check pass.
- `npm run db:migrate` creates local Prisma migrations during development.
- `npm run db:deploy` applies committed migrations.
- `npm run db:seed` seeds plans and promo codes.
- `docker compose -f docker-compose.hub.yml up -d` starts the pull-only deployment stack from Docker Hub.

## Coding Style & Naming Conventions
Use TypeScript with `strict` mode and avoid `any`. Follow the existing style: 2-space indentation, semicolons, and double quotes. Name React components in `PascalCase`, hooks and utilities in `camelCase`, and route folders with lowercase kebab or segment names (`app/dashboard/referrals`, `app/api/admin/users`). Keep API handlers thin; move business rules into `lib/services/*` and Zod validation into validators/schemas.

## Testing Guidelines
There is no dedicated test runner yet. Treat `npm run lint`, `npx tsc --noEmit`, and `npm run build` as the minimum pre-merge gate. For DB-related changes, also run `npm run db:seed` against a local PostgreSQL instance and verify the affected page or API route manually.

## Commit & Pull Request Guidelines
Recent history uses short conventional prefixes such as `infra:`, `fix:`, `polish:`, and `initial:`. Keep commit subjects imperative and scoped, for example `fix: handle expired subscription sync`. PRs should include a short summary, affected areas, required env or migration changes, and screenshots for UI/admin changes. Link the relevant issue or task when one exists.

## Security & Configuration Tips
Never commit `.env`; update `.env.example` when config changes. Keep secrets in environment variables only. When changing auth, payments, webhooks, or admin routes, verify cookie behavior, role checks, and Zod validation paths before merging.
