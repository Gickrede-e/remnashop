# Code and dependency discovery

## Repository facts

Use live configuration and source for versions, routes and implementation locations.
Documentation defines the intended constraints; verify its examples against the current code.

When `graphify-out/graph.json` exists, run `graphify query "<question>"` before source searches; use
`graphify path "<A>" "<B>"` for a relationship and `graphify explain "<concept>"` for a focused concept.
If `graphify-out/wiki/index.md` exists, use it for broad navigation. Read `graphify-out/GRAPH_REPORT.md` only
for a broad architecture review or when query/path/explain do not surface enough context. Treat the graph as
navigation and verify conclusions in the referenced files. After modifying code, run `graphify update .`
(AST-only, no API cost); report an unavailable update rather than claiming the graph is current.

## External APIs

- For Next.js, use the official [Next.js documentation](https://nextjs.org/docs) for the major version in
  `package.json`. Next 16 renamed `middleware` to `proxy`, which is why this repo has `proxy.ts`.
- For the database layer, use the official [Prisma documentation](https://www.prisma.io/docs) for the Prisma
  major version in `package.json`; the schema is `prisma/schema.prisma`, the config `prisma.config.mjs`.
- For the Remnawave panel, rely on the checked-in OpenAPI spec `remnawave_api.json`.
- For payments and webhooks, use the official [YooKassa API reference](https://yookassa.ru/developers/api).
