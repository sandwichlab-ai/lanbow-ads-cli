import type { Command } from 'commander';

import { createAuthManager, type AuthManager } from '../auth/auth-manager.js';
import { createTokenStore } from '../auth/token-store.js';
import { AuthRequiredError, CLIError, formatErrorForDisplay, getRootCause } from '../client/errors.js';
import { createGraphAPIClient, type GraphAPIClient } from '../client/graph-api.js';
import { createRateLimiter } from '../client/rate-limiter.js';
import { createConfigStore } from '../config/config-store.js';
import { resolveConfig } from '../config/resolve.js';
import { createFormatter, type OutputFormatter } from '../output/formatter.js';
import type { RateLimitInfo } from '../types/api.js';
import type { ResolvedConfig } from '../types/config.js';
import type { GlobalOptions } from '../types/common.js';
import { createLogger, type Logger } from '../utils/logger.js';

export interface CommandDeps {
  config: ResolvedConfig;
  authManager: AuthManager;
  client: GraphAPIClient;
  logger: Logger;
  formatter: OutputFormatter;
  createScopedClient(overrides: { baseUrl?: string; timeout?: number }): GraphAPIClient;
}

interface RunCommandOptions {
  requireAuth?: boolean;
}

export async function resolveDeps(globalOptions: GlobalOptions, options?: RunCommandOptions): Promise<CommandDeps> {
  const requireAuth = options?.requireAuth ?? true;
  const logger = createLogger(globalOptions.verbose);
  const config = await resolveConfig({ cliOptions: globalOptions });

  const tokenStore = createTokenStore();
  const configStore = createConfigStore();
  const authManager = createAuthManager({ tokenStore, configStore, logger });

  const accessToken = globalOptions.accessToken ?? config.meta_access_token ?? (
    requireAuth ? await authManager.getAccessToken() : undefined
  );

  const rateLimiter = createRateLimiter(logger);
  const baseClientConfig = {
    accessToken: accessToken ?? '',
    onRateLimit: (info: RateLimitInfo) => rateLimiter.update(info),
    logger,
  };
  const client = createGraphAPIClient(baseClientConfig);

  const format = globalOptions.json
    ? 'json'
    : globalOptions.format
      ? globalOptions.format
      : process.stdout.isTTY
        ? 'table'
        : 'json';

  const formatter = createFormatter({ format });

  return {
    config,
    authManager,
    client,
    logger,
    formatter,
    createScopedClient(overrides) {
      return createGraphAPIClient({ ...baseClientConfig, ...overrides });
    },
  };
}

export function runCommand(
  handler: (deps: CommandDeps, ...args: any[]) => Promise<void>,
  options?: RunCommandOptions,
) {
  return async (...args: any[]) => {
    const cmd = args[args.length - 1] as Command;
    const globalOpts = cmd.optsWithGlobals() as GlobalOptions;

    let deps: CommandDeps | undefined;
    try {
      deps = await resolveDeps(globalOpts, options);
      await handler(deps, ...args.slice(0, -1));
    } catch (error) {
      const cause = getRootCause(error);
      if (cause instanceof AuthRequiredError && deps?.authManager) {
        await deps.authManager.invalidateToken().catch(() => undefined);
      }

      const displayError = error instanceof Error ? error : new Error(String(error));
      console.error(formatErrorForDisplay(displayError));
      const exitCode = cause instanceof CLIError ? cause.exitCode : 1;
      process.exit(exitCode);
    }
  };
}

export function parseJsonOption<T>(value: string | undefined, name: string): T | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    throw new CLIError(`Invalid JSON for --${name}: ${value}`);
  }
}

export function requireAccountId(config: ResolvedConfig): string {
  const accountId = config.default_account_id;
  if (!accountId) {
    throw new CLIError('No account specified. Use --account <id> or run: lanbow-ads config set --account <id>');
  }
  return accountId;
}
