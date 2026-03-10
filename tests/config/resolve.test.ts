import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('resolveConfig', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  it('applies precedence: cli > file > env', async () => {
    process.env.META_APP_ID = 'env_app';
    process.env.META_ACCESS_TOKEN = 'env_token';

    vi.doMock('../../src/config/config-store.js', () => ({
      createConfigStore: () => ({
        load: async () => ({
          meta_app_id: 'file_app',
          meta_access_token: 'file_token',
          accounts: {
            team: { account_id: 'act_999' },
          },
        }),
      }),
    }));

    const { resolveConfig } = await import('../../src/config/resolve.js');
    const resolved = await resolveConfig({
      cliOptions: {
        accessToken: 'cli_token',
        account: 'team',
      },
    });

    expect(resolved.meta_app_id).toBe('file_app');
    expect(resolved.meta_access_token).toBe('cli_token');
    expect(resolved.default_account_id).toBe('act_999');

    expect(resolved.sources.meta_app_id).toBe('file');
    expect(resolved.sources.meta_access_token).toBe('cli');
    expect(resolved.sources.default_account_id).toBe('cli');
  });

  it('parses boolean env keys', async () => {
    process.env.META_ADS_DISABLE_CALLBACK_SERVER = 'yes';

    vi.doMock('../../src/config/config-store.js', () => ({
      createConfigStore: () => ({ load: async () => ({}) }),
    }));

    const { resolveConfig } = await import('../../src/config/resolve.js');
    const resolved = await resolveConfig();

    expect(resolved.meta_ads_disable_callback_server).toBe(true);
    expect(resolved.sources.meta_ads_disable_callback_server).toBe('env');
  });

  it('does not resolve META_ACCESS_TOKEN from env into config', async () => {
    process.env.META_ACCESS_TOKEN = 'env_token_should_not_be_loaded_here';

    vi.doMock('../../src/config/config-store.js', () => ({
      createConfigStore: () => ({ load: async () => ({}) }),
    }));

    const { resolveConfig } = await import('../../src/config/resolve.js');
    const resolved = await resolveConfig();

    expect(resolved.meta_access_token).toBeUndefined();
    expect(resolved.sources.meta_access_token).toBeUndefined();
  });

  it('resolves numeric account ids to act_ prefix', async () => {
    vi.doMock('../../src/config/config-store.js', () => ({
      createConfigStore: () => ({ load: async () => ({}) }),
    }));

    const { resolveConfig } = await import('../../src/config/resolve.js');
    const resolved = await resolveConfig({
      cliOptions: {
        account: '123456',
      },
    });

    expect(resolved.default_account_id).toBe('act_123456');
  });

  it('throws for unknown alias account ids', async () => {
    vi.doMock('../../src/config/config-store.js', () => ({
      createConfigStore: () => ({ load: async () => ({ accounts: { known: { account_id: 'act_1' } } }) }),
    }));

    const { resolveConfig } = await import('../../src/config/resolve.js');

    await expect(
      resolveConfig({
        cliOptions: {
          account: 'missing_alias',
        },
      }),
    ).rejects.toThrow(/Unknown account/);
  });
});
