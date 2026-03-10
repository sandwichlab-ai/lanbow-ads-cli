import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('config accounts handlers', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function loadModuleWithStore(store: {
    load: () => Promise<Record<string, unknown>>;
    set: (key: string, value: unknown) => Promise<void>;
  }) {
    vi.doMock('../../src/config/config-store.js', () => ({
      createConfigStore: () => ({
        ...store,
        save: vi.fn(),
        get: vi.fn(),
        unset: vi.fn(),
        getPath: vi.fn().mockReturnValue('/tmp/config.json'),
      }),
    }));

    return import('../../src/commands/config.cmd.js');
  }

  it('normalizes numeric account ids for alias add', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const set = vi.fn().mockResolvedValue(undefined);
    const mod = await loadModuleWithStore({
      load: async () => ({}),
      set,
    });

    await mod.handleConfigAccountsAdd({} as any, 'main', '123', { label: 'Main' });

    expect(set).toHaveBeenCalledWith('accounts', {
      main: { account_id: 'act_123', label: 'Main' },
    });
    expect(log).toHaveBeenCalledWith('Added alias "main" -> act_123');
  });

  it('rejects alias names that look like account ids', async () => {
    const mod = await loadModuleWithStore({
      load: async () => ({}),
      set: vi.fn().mockResolvedValue(undefined),
    });

    await expect(mod.handleConfigAccountsAdd({} as any, 'act_999', '123', {})).rejects.toThrow(
      /Alias cannot look like an account ID/,
    );
    await expect(mod.handleConfigAccountsAdd({} as any, '123', '123', {})).rejects.toThrow(
      /Alias cannot look like an account ID/,
    );
  });

  it('lists aliases via formatter and fills missing label', async () => {
    const formatter = { output: vi.fn() };
    const mod = await loadModuleWithStore({
      load: async () => ({
        accounts: {
          zeta: { account_id: 'act_2' },
          alpha: { account_id: 'act_1', label: 'Primary' },
        },
      }),
      set: vi.fn().mockResolvedValue(undefined),
    });

    await mod.handleConfigAccountsList({ formatter } as any);

    expect(formatter.output).toHaveBeenCalledWith(
      [
        { alias: 'alpha', account_id: 'act_1', label: 'Primary' },
        { alias: 'zeta', account_id: 'act_2', label: '-' },
      ],
      {
        columns: ['alias', 'account_id', 'label'],
        title: 'Account Aliases',
      },
    );
  });

  it('prints hint when no aliases configured', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const formatter = { output: vi.fn() };
    const mod = await loadModuleWithStore({
      load: async () => ({}),
      set: vi.fn().mockResolvedValue(undefined),
    });

    await mod.handleConfigAccountsList({ formatter } as any);

    expect(formatter.output).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('No account aliases. Run: lanbow-ads config accounts add <alias> <account-id>');
  });

  it('removes an existing alias and persists remaining entries', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const set = vi.fn().mockResolvedValue(undefined);
    const mod = await loadModuleWithStore({
      load: async () => ({
        accounts: {
          main: { account_id: 'act_1', label: 'Main' },
          test: { account_id: 'act_2' },
        },
      }),
      set,
    });

    await mod.handleConfigAccountsRemove({} as any, 'test');

    expect(set).toHaveBeenCalledWith('accounts', {
      main: { account_id: 'act_1', label: 'Main' },
    });
    expect(log).toHaveBeenCalledWith('Removed alias "test"');
  });

  it('throws when removing a missing alias', async () => {
    const mod = await loadModuleWithStore({
      load: async () => ({ accounts: { main: { account_id: 'act_1' } } }),
      set: vi.fn().mockResolvedValue(undefined),
    });

    await expect(mod.handleConfigAccountsRemove({} as any, 'missing')).rejects.toThrow(/not found/);
  });
});
