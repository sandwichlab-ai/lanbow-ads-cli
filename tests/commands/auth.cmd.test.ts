import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CLIError } from '../../src/client/errors.js';

const authCommandTestState = vi.hoisted(() => ({
  config: {} as { meta_app_id?: string; meta_app_secret?: string },
  exchangeResult: undefined as { accessToken: string; expiresIn?: number; createdAt: number } | undefined,
  exchangeError: undefined as Error | undefined,
  save: vi.fn(),
  runCommand: vi.fn((handler: (_deps: unknown, ...args: unknown[]) => Promise<void>) => {
    return async (...args: unknown[]) => handler({}, ...args);
  }),
  exchangeForLongLivedToken: vi.fn(),
}));

vi.mock('../../src/commands/shared.js', () => ({
  runCommand: authCommandTestState.runCommand,
}));

vi.mock('../../src/config/config-store.js', () => ({
  createConfigStore: () => ({
    load: async () => authCommandTestState.config,
  }),
}));

vi.mock('../../src/auth/token-store.js', () => ({
  createTokenStore: () => ({
    save: authCommandTestState.save,
  }),
}));

vi.mock('../../src/auth/token-exchange.js', () => ({
  exchangeForLongLivedToken: authCommandTestState.exchangeForLongLivedToken,
}));

describe('auth command handler', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    authCommandTestState.config = {};
    authCommandTestState.exchangeResult = undefined;
    authCommandTestState.exchangeError = undefined;
    authCommandTestState.save.mockReset().mockResolvedValue(undefined);
    authCommandTestState.runCommand.mockClear();
    authCommandTestState.exchangeForLongLivedToken.mockReset().mockImplementation(async () => {
      if (authCommandTestState.exchangeError) {
        throw authCommandTestState.exchangeError;
      }
      if (!authCommandTestState.exchangeResult) {
        throw new Error('exchange result not configured');
      }
      return authCommandTestState.exchangeResult;
    });
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    delete process.env.META_APP_ID;
    delete process.env.META_APP_SECRET;
  });

  async function loadModule(options?: {
    config?: { meta_app_id?: string; meta_app_secret?: string };
    exchangeResult?: { accessToken: string; expiresIn?: number; createdAt: number };
    exchangeError?: Error;
  }) {
    authCommandTestState.config = options?.config ?? {};
    authCommandTestState.exchangeResult = options?.exchangeResult;
    authCommandTestState.exchangeError = options?.exchangeError;

    const { registerAuthCommand } = await import('../../src/commands/auth.cmd.js');
    const program = new Command();
    registerAuthCommand(program);
    const auth = program.commands.find((command) => command.name() === 'auth');
    const exchange = auth?.commands.find((command) => command.name() === 'exchange');
    if (!exchange) {
      throw new Error('exchange command not found');
    }
    return {
      exchange,
      save: authCommandTestState.save,
      exchangeForLongLivedToken: authCommandTestState.exchangeForLongLivedToken,
    };
  }

  it('exchanges token and saves it to the cache', async () => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const { exchange, save, exchangeForLongLivedToken } = await loadModule({
      config: { meta_app_id: 'app_1', meta_app_secret: 'secret_1' },
      exchangeResult: {
        accessToken: 'long_token',
        expiresIn: 5_184_000,
        createdAt: Date.UTC(2026, 2, 2),
      },
    });

    await exchange.parseAsync(['node', 'test', '--token', 'short_token']);

    expect(exchangeForLongLivedToken).toHaveBeenCalledWith('short_token', 'app_1', 'secret_1');
    expect(save).toHaveBeenCalledWith({
      accessToken: 'long_token',
      expiresIn: 5_184_000,
      createdAt: Date.UTC(2026, 2, 2),
    });
    expect(consoleLog.mock.calls).toEqual([
      ['Token exchanged successfully.'],
      ['Token expires in 60 days.'],
    ]);
  });

  it('falls back to env app credentials when config is missing', async () => {
    process.env.META_APP_ID = 'env_app';
    process.env.META_APP_SECRET = 'env_secret';
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const { exchange, exchangeForLongLivedToken } = await loadModule({
      exchangeResult: {
        accessToken: 'long_token',
        createdAt: Date.UTC(2026, 2, 2),
      },
    });

    await exchange.parseAsync(['node', 'test', '--token', 'short_token']);

    expect(exchangeForLongLivedToken).toHaveBeenCalledWith('short_token', 'env_app', 'env_secret');
  });

  it('throws when app id is missing', async () => {
    const { exchange } = await loadModule({
      config: { meta_app_secret: 'secret_1' },
    });

    await expect(exchange.parseAsync(['node', 'test', '--token', 'short_token'])).rejects.toEqual(
      new CLIError('App ID required. Run: lanbow config set --app-id YOUR_APP_ID'),
    );
  });

  it('throws when app secret is missing', async () => {
    const { exchange } = await loadModule({
      config: { meta_app_id: 'app_1' },
    });

    await expect(exchange.parseAsync(['node', 'test', '--token', 'short_token'])).rejects.toEqual(
      new CLIError('App secret required. Run: lanbow config set --app-secret YOUR_APP_SECRET'),
    );
  });
});
