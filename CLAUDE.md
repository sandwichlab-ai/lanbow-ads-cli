# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**lanbow** — a CLI for Meta (Facebook/Instagram) Ads management. TypeScript, ESM-only, Node 18+.

## Commands

```bash
npm run dev                          # Run CLI via tsx (e.g., npm run dev campaigns list)
npm run build                        # Build with tsup → dist/index.js
npm run test                         # Run all tests (vitest)
npm run test:watch                   # Watch mode
npx vitest run tests/path/file.test.ts  # Run a single test file
npm run typecheck                    # tsc --noEmit (source)
npm run typecheck:tests              # tsc -p tsconfig.tests.json --noEmit
```

## Architecture

### Layered structure (dependency flows downward only)

```
commands/  →  services/  →  client/graph-api.ts  →  Meta Graph API
    ↓             ↓
schemas/      types/         auth/         config/        output/        utils/
```

- **`commands/`** — Commander.js command definitions. Each file registers a command group (campaigns, adsets, ads, etc.). All commands use `runCommand()` from `commands/shared.ts` which resolves dependencies (auth, config, client, formatter) and handles errors.
- **`services/`** — Business logic. Validate input with Zod schemas, call GraphAPIClient, enrich errors with context. `crud-base.ts` provides shared list/get factories.
- **`client/`** — `GraphAPIClient` wraps native fetch against `https://graph.facebook.com/v24.0`. Methods: `getList<T>`, `getObject<T>`, `post<T>`, `postFormData<T>`, `delete<T>`. Error classification maps API error codes to typed errors (AuthRequiredError, RateLimitError, etc.).
- **`schemas/`** — Zod schemas are the single source of truth for CLI input validation. Types are inferred via `z.infer<T>`. API response types are plain TS interfaces in `types/` (no runtime validation).
- **`auth/`** — OAuth implicit flow via local HTTP server → token cached in `token_cache.json`. Token resolution priority: CLI flag → config file → cached OAuth → env var.
- **`config/`** — 3-level precedence: CLI options > config.json > env vars. Config keys are snake_case. Account aliases map friendly names to `act_` IDs.
- **`output/`** — Auto-selects table (TTY) or JSON (piped). All log output goes to stderr; stdout is reserved for data.

### Key conventions

- **Factory functions** (`createAuthManager`, `createFormatter`, etc.) — no classes except where Commander requires them.
- **Monetary values** — Meta API uses cents; `centsToAmount()` in `utils/monetary.ts` converts using ISO 4217 exponents.
- **Error enrichment** — Services wrap errors with `enrichError(error, context)` to add human-readable context.
- **Config/token paths** — OS-specific via `utils/platform.ts` (e.g., `~/Library/Application Support/lanbow-ads/` on macOS).
- **Colors** — Pure ANSI codes in `output/colors.ts`, no dependencies. Respects `NO_COLOR` env var.

## Testing

Tests are in `tests/` mirroring `src/` structure. Tests use vitest globals (no imports needed for `describe`, `it`, `expect`). Dependencies are mocked — tests don't hit the real API.
