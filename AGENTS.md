RemnaShop (GickShop) is a Next.js 16 shop that sells Remnawave VPN subscriptions, with YooKassa payments and a
Prisma 7 / PostgreSQL store.

Use the checked-in `package-lock.json` (`npm ci`).

Always apply the `ponytail:ponytail` skill at the `ultra` level.

## Build and checks

| Check | Command |
| --- | --- |
| Lint | `npm run lint` |
| Unit tests | `npx vitest run` (`npm test` starts watch mode) |
| Integration tests | `npm run test:integration` (needs `TEST_DATABASE_URL` pointing at a PostgreSQL test database) |
| Browser tests | `npm run test:browser` |
| Build | `npm run build` |

## Read for the task

Read the applicable guide before taking the action; follow deeper links for the area being changed.

| Task | Guide |
| --- | --- |
| Investigate code, dependencies or external APIs | [Discovery and official documentation](docs/agents/DISCOVERY.md) |
| Modify code, schema, configuration or documentation | [Validation and debugging](docs/agents/TESTING.md) |
| Commit, push or release an image | [Commits and deployment](docs/agents/DELIVERY.md) |
| Write or edit code | [Code style](CODE_STYLE.md) |
| Use or change domain terms (payments, activations, Remnawave accounts) | [Domain glossary](CONTEXT.md) |
| Change how payments become subscription activations | [ADR 0001](docs/adr/0001-payment-activation-order.md) |
| Configure outgoing mail | [SMTP setup](docs/SMTP-SETUP.md), [Google Workspace SMTP](docs/SMTP-GOOGLE-WORKSPACE.md) |
| Set up the AI tools on a new machine | [AI tools](AI-TOOLS.md) |
