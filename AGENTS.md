# Repository Guidelines

## Project Structure & Module Organization
This repository is a Next.js 16 + Prisma 7 application. App Router routes live in `app/` (`app/api` for handlers, `app/admin` and `app/dashboard` for product surfaces). Shared UI components live in `components/`, server logic in `lib/` (`lib/services`, `lib/auth`, `lib/server`), database schema and migrations in `prisma/`, static assets in `public/`, and operational scripts in `scripts/`. Tests mirror the codebase under `__tests__/`, with mocks in `__mocks__/`.

## Build, Test, and Development Commands
- `npm run dev`: start the local Next.js dev server.
- `npm run build`: generate Prisma client and build the production app.
- `npm run start`: run the production server locally.
- `npm run lint`: run ESLint with Next core-web-vitals and TypeScript rules.
- `npm test`: run the Vitest suite.
- `npm run test:coverage`: run tests with V8 coverage.
- `npm run db:generate`, `npm run db:migrate`, `npm run db:deploy`, `npm run db:seed`: Prisma workflows.
- `docker compose -f docker-compose.hub.yml build`: local container build.
- `docker compose up -d`: pull-only deployment path using `APP_IMAGE`.

## Coding Style & Naming Conventions
Use TypeScript/ESM with 2-space indentation, semicolons, and double quotes, matching existing files such as `lib/prisma.ts`. Prefer small focused modules and keep server-only logic out of UI components. Use PascalCase for React components, camelCase for functions/variables, and descriptive route/file names (`app/api/health/route.ts`, `lib/services/payments.ts`). Lint before opening a PR.

## Testing Guidelines
Vitest is the test runner. Add tests under `__tests__/` with names ending in `.test.ts`, mirroring the source area they cover, for example `__tests__/prisma/seed.test.ts`. Favor fast unit/integration coverage for service logic, schema validation, and route helpers. Run `npm test` before pushing; use `npm run test:coverage` when changing critical flows.

## Commit & Pull Request Guidelines
Recent history uses short imperative subjects, often with a scope prefix, for example `fix(docker): pass build env to compose images` or `Refactor Docker runtime and shared migrate image`. Follow that style. PRs should summarize behavior changes, list verification steps, and call out schema, Docker, or environment-variable changes explicitly. Include screenshots for UI changes.

## Security & Configuration Tips
Do not commit `.env` values or generated `.next*` artifacts. For Docker builds, pass runtime secrets through BuildKit secrets and keep only `NEXT_PUBLIC_*` values in build args. Use `docker-compose.hub.yml` for local builds and `docker-compose.yml` for image-based deployment.
