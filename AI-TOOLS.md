# AI tools used on this project

What to install on a new machine to get the same AI setup. No secrets here: sign in to each app again,
and re-enter any API keys yourself.

## Claude Code (desktop app, Code tab)

**Plugins** (`~/.claude/settings.json` → `enabledPlugins`, with their marketplaces in `extraKnownMarketplaces`):

| Plugin | Marketplace | What it gives |
|---|---|---|
| `ponytail@ponytail` | git `https://github.com/DietrichGebert/ponytail.git` | "lazy senior dev" mode, `/ponytail-review`, `/ponytail-audit`, `/ponytail-debt` |
| `mattpocock-skills@mattpocock` | GitHub `mattpocock/skills` | tdd, diagnosing-bugs, code-review, grilling, prototype, research, domain-modeling, codebase-design, pr, wizard, writing-for-agents |

**User skills** (`~/.claude/skills/`):

- `graphify`: builds a knowledge graph of the code; trigger `/graphify`.

**User instructions** (copy these files as they are):

- `~/.claude/CLAUDE.md`: language, SSH, graphify trigger
- `~/.claude/coding-style.md`: the coding style it imports

**Project config** (under `.claude/`, which is not in git; recreate it on each machine):

- `.claude/settings.json`: PreToolUse hooks that run `graphify hook-guard`. The command path is
  `/home/gickrede/.local/bin/graphify`, the Linux machine's path. On Windows, change it to
  `graphify` or the full path to `graphify.exe`.
- `.claude/launch.json`: the dev-server preview configuration.

## graphify

- The `graphify` CLI in `~/.local/bin`: `uv tool install graphifyy` (two y's: that is the package name).
  Then `graphify update .` in the project rebuilds `graphify-out/` with no LLM.
- `graphify-out/` is not in git; rebuild it on each machine.

## Codex (OpenAI desktop app)

- Config: `~/.codex/config.toml`.
- Global instructions: `~/.codex/AGENTS.md`. Codex reads this repo's `AGENTS.md` directly.

## What the project tools need (not AI, but needed to run checks)

- Node.js 22 (the Docker image pins `22.14.0`; `package.json` accepts `^22.12.0 || >=24.0.0`).
- PostgreSQL for the dev server and integration tests.
- Chromium for browser tests: `npm run test:e2e:install`.
- Docker Desktop with WSL integration for building and pushing images.
