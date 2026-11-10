# Commits and deployment

## Commits

Make one commit per finished change. Explain why the change was needed; for a behavioral bug fix, name the
planted fault that its regression test caught. Documentation-only commits describe the instruction or
reference problem they resolve.

The origin, `github.com/Gickrede-e/remnashop`, is public. Before pushing, scan the unpushed range
(`git log -p origin/main..HEAD`) for live `.env` values and other secrets.

## Deployment

CI builds the image but never pushes it. Images are built and pushed by hand to Docker Hub as
`gickrede/remnashop`, with a dated tag plus `:latest`.

Production compose runs `gickrede/remnashop:latest` with `pull_policy: always`, and its `migrate` service
applies migrations before the app and worker start. Pushing `:latest` is therefore a production deploy:
confirm with the user before overwriting it, and record the previous `:latest` digest or dated tag for
rollback.

The build uses the local `.env` as the `build_env` secret. Its `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
is expected: the server reads the real site URL from the server's own `.env` at runtime (`lib/env.ts`).
