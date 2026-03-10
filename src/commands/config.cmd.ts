import type { Command } from 'commander';

import { CLIError } from '../client/errors.js';
import { createConfigStore } from '../config/config-store.js';
import {
  ALL_CONFIG_KEYS,
  CLI_OPTION_MAP,
  SENSITIVE_KEYS,
  maskSensitiveValue,
} from '../config/config-schema.js';
import { resolveConfig } from '../config/resolve.js';
import type { AccountAlias } from '../types/config.js';
import type { CommandDeps } from './shared.js';
import { runCommand } from './shared.js';

function normalizeCliValue(key: string, value: string): unknown {
  if (key === 'meta_ads_disable_callback_server' || key === 'meta_ads_disable_login_link') {
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  }

  return value;
}

export function normalizeAccountIdInput(value: string): string {
  if (/^act_\d+$/.test(value)) {
    return value;
  }
  if (/^\d+$/.test(value)) {
    return `act_${value}`;
  }
  throw new CLIError(`Invalid account ID "${value}". Use act_<digits> or numeric ID.`);
}

async function handleConfigSet(
  _deps: CommandDeps,
  options: {
    appId?: string;
    appSecret?: string;
    account?: string;
    key?: string;
    value?: string;
  },
): Promise<void> {
  const store = createConfigStore();

  let updates = 0;
  if (options.appId) {
    const value = options.appId;
    await store.set(CLI_OPTION_MAP['--app-id']!, value);
    updates += 1;
  }
  if (options.appSecret) {
    const value = options.appSecret;
    await store.set(CLI_OPTION_MAP['--app-secret']!, value);
    updates += 1;
  }
  if (options.account) {
    const value = options.account;
    await store.set(CLI_OPTION_MAP['--account']!, value);
    updates += 1;
  }
  if (options.key) {
    if (!options.value) {
      throw new CLIError('--value is required when using --key');
    }
    await store.set(options.key, normalizeCliValue(options.key, options.value));
    updates += 1;
  }

  if (updates === 0) {
    throw new CLIError('No config values provided. Use --app-id/--app-secret/--account or --key --value');
  }

  console.log(`Updated ${updates} config value(s) at ${store.getPath()}`);
}

async function handleConfigGet(_deps: CommandDeps, key: string): Promise<void> {
  if (!ALL_CONFIG_KEYS.includes(key as (typeof ALL_CONFIG_KEYS)[number])) {
    throw new CLIError(`Unknown config key: "${key}"`);
  }

  const resolved = await resolveConfig();
  const value = (resolved as unknown as Record<string, unknown>)[key];
  const source = resolved.sources[key as keyof typeof resolved.sources] ?? 'none';

  if (value == null) {
    console.log(`${key}=<unset> (source: ${source})`);
    return;
  }

  const display = SENSITIVE_KEYS.includes(key as any) ? maskSensitiveValue(String(value)) : value;
  console.log(`${key}=${display} (source: ${source})`);
}

async function handleConfigList(_deps: CommandDeps): Promise<void> {
  const resolved = await resolveConfig();

  for (const key of ALL_CONFIG_KEYS) {
    const value = (resolved as unknown as Record<string, unknown>)[key];
    const source = resolved.sources[key as keyof typeof resolved.sources] ?? 'none';
    const display = value == null
      ? '<unset>'
      : SENSITIVE_KEYS.includes(key as any)
        ? maskSensitiveValue(String(value))
        : JSON.stringify(value);

    console.log(`${key}=${display} (source: ${source})`);
  }
}

async function handleConfigUnset(_deps: CommandDeps, key: string): Promise<void> {
  const store = createConfigStore();
  await store.unset(key);
  console.log(`Removed ${key} from config file`);
}

export async function handleConfigAccountsList(deps: CommandDeps): Promise<void> {
  const store = createConfigStore();
  const config = await store.load();
  const accounts = config.accounts ?? {};
  const rows = Object.entries(accounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([alias, info]) => ({
      alias,
      account_id: info.account_id,
      label: info.label ?? '-',
    }));

  if (rows.length === 0) {
    console.log('No account aliases. Run: lanbow-ads config accounts add <alias> <account-id>');
    return;
  }

  deps.formatter.output(rows, {
    columns: ['alias', 'account_id', 'label'],
    title: 'Account Aliases',
  });
}

export async function handleConfigAccountsAdd(
  _deps: CommandDeps,
  alias: string,
  accountId: string,
  options: { label?: string },
): Promise<void> {
  const normalizedAlias = alias.trim();
  if (!normalizedAlias) {
    throw new CLIError('Alias cannot be empty.');
  }
  if (/^act_/i.test(normalizedAlias) || /^\d+$/.test(normalizedAlias)) {
    throw new CLIError('Alias cannot look like an account ID ("act_..." or numeric). Use a descriptive name.');
  }

  const normalizedId = normalizeAccountIdInput(accountId.trim());
  const store = createConfigStore();
  const config = await store.load();
  const accounts: Record<string, AccountAlias> = { ...(config.accounts ?? {}) };

  accounts[normalizedAlias] = {
    account_id: normalizedId,
    label: options.label,
  };

  await store.set('accounts', accounts);
  console.log(`Added alias "${normalizedAlias}" -> ${normalizedId}`);
}

export async function handleConfigAccountsRemove(_deps: CommandDeps, alias: string): Promise<void> {
  const normalizedAlias = alias.trim();
  const store = createConfigStore();
  const config = await store.load();
  const accounts: Record<string, AccountAlias> = { ...(config.accounts ?? {}) };

  if (!accounts[normalizedAlias]) {
    throw new CLIError(`Alias "${normalizedAlias}" not found.`);
  }

  delete accounts[normalizedAlias];
  await store.set('accounts', accounts);
  console.log(`Removed alias "${normalizedAlias}"`);
}

export function registerConfigCommand(program: Command): void {
  const config = program.command('config').description('Configuration management');

  config
    .command('set')
    .description('Set a configuration value')
    .option('--app-id <id>', 'Meta App ID')
    .option('--app-secret <secret>', 'Meta App Secret')
    .option('--account <id>', 'Default ad account ID')
    .option('--key <key>', 'Config key name')
    .option('--value <value>', 'Config value')
    .action(runCommand(handleConfigSet, { requireAuth: false }));

  config
    .command('get <key>')
    .description('Get a configuration value')
    .action(runCommand(handleConfigGet, { requireAuth: false }));
  config.command('list').description('List all configuration').action(runCommand(handleConfigList, { requireAuth: false }));
  config
    .command('unset <key>')
    .description('Remove a configuration value from the config file')
    .action(runCommand(handleConfigUnset, { requireAuth: false }));

  const accounts = config.command('accounts').description('Manage account aliases');

  accounts
    .command('list')
    .description('List account aliases')
    .action(runCommand(handleConfigAccountsList, { requireAuth: false }));

  accounts
    .command('add <alias> <account-id>')
    .description('Add or update an account alias')
    .option('--label <text>', 'Optional label')
    .action(runCommand(handleConfigAccountsAdd, { requireAuth: false }));

  accounts
    .command('remove <alias>')
    .description('Remove an account alias')
    .action(runCommand(handleConfigAccountsRemove, { requireAuth: false }));
}
