# lanbow-ads

A command-line tool for managing Meta (Facebook/Instagram) Ads. Built with TypeScript, ESM-only, Node 18+.

## Quick Start

```bash
# Install dependencies
npm install

# Configure your Meta App
lanbow-ads config set --app-id YOUR_APP_ID
lanbow-ads config set --app-secret YOUR_APP_SECRET

# Authenticate
lanbow-ads auth login

# Set default ad account
lanbow-ads config set --account act_123456789

# Start managing ads
lanbow-ads campaigns list
lanbow-ads insights get --date-preset last_7d
```

## Installation

```bash
npm install
npm run build    # Builds to dist/index.js
```

During development, use `npm run dev` to run without building:

```bash
npm run dev campaigns list --limit 10
```

## Authentication

lanbow-ads uses OAuth implicit flow with a local callback server:

```bash
lanbow-ads auth login              # Opens browser for OAuth
lanbow-ads auth status             # Check current auth state
lanbow-ads auth logout             # Clear cached token
lanbow-ads auth exchange --token <short_token>  # Exchange for long-lived token (60 days)
```

**Token resolution order**: CLI `--access-token` flag > config file > cached OAuth token > `META_ACCESS_TOKEN` env var.

### Required OAuth Scopes

`ads_management`, `ads_read`, `business_management`, `instagram_basic`, `public_profile`, `pages_show_list`, `pages_read_engagement`

## Commands

### Campaigns

```bash
lanbow-ads campaigns list [--status ACTIVE PAUSED] [--objective <obj>] [--limit 25] [--all]
lanbow-ads campaigns get <campaign-id>
lanbow-ads campaigns create --name "My Campaign" --objective OUTCOME_TRAFFIC [--daily-budget 5000] [--status PAUSED]
lanbow-ads campaigns update <campaign-id> [--name "New Name"] [--status ACTIVE] [--daily-budget 10000]
```

### Ad Sets

```bash
lanbow-ads adsets list [--campaign <id>] [--status ACTIVE]
lanbow-ads adsets get <adset-id>
lanbow-ads adsets create --campaign-id <id> --name "My AdSet" --optimization-goal LINK_CLICKS --billing-event IMPRESSIONS [--targeting '<json>']
lanbow-ads adsets update <adset-id> [--name "New Name"] [--status ACTIVE] [--targeting '<json>']
```

### Ads

```bash
lanbow-ads ads list [--adset <id>] [--campaign <id>] [--status ACTIVE]
lanbow-ads ads get <ad-id>
lanbow-ads ads create --name "My Ad" --adset-id <id> --creative-id <id> [--status PAUSED]
lanbow-ads ads update <ad-id> [--name "New Name"] [--status ACTIVE]
```

### Creatives

```bash
lanbow-ads creatives list [--ad <id>]
lanbow-ads creatives get <creative-id>
lanbow-ads creatives create --name "My Creative" [--page-id <id>] [--image-hash <hash>] [--link <url>] [--message "Ad text"] [--headline "Title"] [--call-to-action LEARN_MORE]
lanbow-ads creatives update <creative-id> --name "New Name"
```

### Media Upload

```bash
lanbow-ads images upload --file ./banner.jpg [--name "Banner"]
lanbow-ads videos upload --file ./promo.mp4 [--title "Promo Video"] [--auto-thumbnail]
```

### Insights

```bash
lanbow-ads insights get [--campaign <id>] [--adset <id>] [--ad <id>]
    [--level account|campaign|adset|ad]
    [--date-preset last_7d|last_30d|...]
    [--since 2024-01-01 --until 2024-01-31]
    [--breakdowns age gender country]
    [--time-increment 1|monthly]
    [--sort -spend]
```

### Targeting

```bash
lanbow-ads targeting interests "coffee"          # Search interests
lanbow-ads targeting suggestions --interests "Coffee" "Tea"  # Get suggestions
lanbow-ads targeting locations "New York" [--type city country]
lanbow-ads targeting behaviors
lanbow-ads targeting demographics [--class demographics|income|life_events]
lanbow-ads targeting estimate --targeting '<json>'  # Estimate audience size
```

### Pages

```bash
lanbow-ads pages list                            # List accessible Facebook pages
lanbow-ads pages instagram <page-id>             # Get linked Instagram account
```

### Accounts

```bash
lanbow-ads accounts list [--limit 25] [--all]    # List ad accounts
lanbow-ads accounts info <account-id>            # Account details
```

### Global Options

All commands support:

```
--json                  Force JSON output
--format table|json     Set output format
--verbose               Enable debug logging
--account <id|alias>    Override ad account
--access-token <token>  Override access token
```

## Configuration

```bash
lanbow-ads config set --app-id <id>        # Set Meta App ID
lanbow-ads config set --app-secret <secret> # Set Meta App Secret
lanbow-ads config set --account <id>       # Set default account
lanbow-ads config get <key>                # Get config value
lanbow-ads config list                     # List all config
lanbow-ads config unset <key>              # Remove config value
```

### Account Aliases

Map friendly names to account IDs:

```bash
lanbow-ads config accounts add prod act_123456789 --label "Production"
lanbow-ads config accounts add staging act_987654321

# Then use alias anywhere
lanbow-ads campaigns list --account prod
```

### Config File Location

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/lanbow-ads/config.json` |
| Linux | `~/.config/lanbow-ads/config.json` |
| Windows | `%APPDATA%\lanbow-ads\config.json` |

### Environment Variables

| Variable | Description |
|----------|-------------|
| `META_APP_ID` | Meta App ID |
| `META_APP_SECRET` | Meta App Secret |
| `META_ACCESS_TOKEN` | Access token (lowest priority) |
| `NO_COLOR` | Disable colored output |

**Precedence**: CLI flags > config file > environment variables.

## Output

- **Terminal (TTY)**: Formatted table via cli-table3
- **Piped**: JSON (script-friendly)

Override with `--json` or `--format table|json`. Data always goes to stdout; logs go to stderr.

## Architecture

```
commands/  →  services/  →  client/graph-api.ts  →  Meta Graph API (v24.0)
    ↓             ↓
schemas/      types/         auth/         config/        output/        utils/
```

- **commands/** — CLI definitions using Commander.js. All commands use `runCommand()` for dependency resolution and error handling.
- **services/** — Business logic with Zod validation, API calls, and error enrichment. `crud-base.ts` provides shared list/get factories.
- **client/** — `GraphAPIClient` wraps fetch against `https://graph.facebook.com/v24.0`. Classifies API errors into typed error classes.
- **schemas/** — Zod schemas are the single source of truth for CLI input validation. Types inferred via `z.infer<T>`.
- **auth/** — OAuth implicit flow with local HTTP callback server. Token caching and long-lived token exchange.
- **config/** — 3-level config precedence with account alias support.
- **output/** — Auto-selects table or JSON based on TTY detection.

### Design Principles

- Factory functions over classes (`createAuthManager`, `createGraphAPIClient`, etc.)
- Monetary values in cents, converted with ISO 4217 exponents via `centsToAmount()`
- Errors enriched with human-readable context via `enrichError()`
- Pure ANSI colors with `NO_COLOR` support, no dependencies

## Development

```bash
npm run dev                  # Run CLI via tsx
npm run build                # Build with tsup
npm run test                 # Run all tests (vitest)
npm run test:watch           # Watch mode
npm run typecheck            # Type check source
npm run typecheck:tests      # Type check tests
```

Tests mirror `src/` structure under `tests/`, use vitest globals, and mock all external dependencies.

## License

Private
