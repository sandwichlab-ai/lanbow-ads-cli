import { CLIError } from '../client/errors.js';
import type { AccountAlias, ConfigSource, ResolvedConfig } from '../types/config.js';
import type { GlobalOptions } from '../types/common.js';

import { BOOLEAN_KEYS, CONFIG_ENV_MAP, parseBooleanValue } from './config-schema.js';
import { createConfigStore } from './config-store.js';

interface ResolveConfigOptions {
  cliOptions?: GlobalOptions;
}

function resolveAccountId(input: string, accounts?: Record<string, AccountAlias>): string {
  if (input.startsWith('act_')) {
    return input;
  }

  if (accounts?.[input]) {
    return accounts[input].account_id;
  }

  if (/^\d+$/.test(input)) {
    return `act_${input}`;
  }

  throw new CLIError(`Unknown account: "${input}". Use act_ID or configure an alias.`);
}

export async function resolveConfig(options?: ResolveConfigOptions): Promise<ResolvedConfig> {
  const configStore = createConfigStore();
  const fileConfig = await configStore.load();

  const sources: Partial<Record<string, ConfigSource>> = {};
  const resolved: Record<string, unknown> = {};

  for (const [configKey, envVar] of Object.entries(CONFIG_ENV_MAP)) {
    const envValue = process.env[envVar];
    if (envValue !== undefined) {
      resolved[configKey] = BOOLEAN_KEYS.includes(configKey as (typeof BOOLEAN_KEYS)[number])
        ? parseBooleanValue(envValue)
        : envValue;
      sources[configKey] = 'env';
    }
  }

  for (const [key, value] of Object.entries(fileConfig)) {
    if (value !== undefined) {
      resolved[key] = value;
      sources[key] = 'file';
    }
  }

  if (options?.cliOptions) {
    const cli = options.cliOptions;
    if (cli.accessToken) {
      resolved.meta_access_token = cli.accessToken;
      sources.meta_access_token = 'cli';
    }

    if (cli.account) {
      resolved.default_account_id = resolveAccountId(cli.account, fileConfig.accounts);
      sources.default_account_id = 'cli';
    }
  }

  return { ...(resolved as Record<string, unknown>), sources } as ResolvedConfig;
}

export { resolveAccountId };
