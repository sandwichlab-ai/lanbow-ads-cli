import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthRequiredError } from '../../src/client/errors.js';

describe('auth-manager', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetModules();
    delete process.env.META_ACCESS_TOKEN;
  });

  async function loadAuthManager() {
    const mod = await import('../../src/auth/auth-manager.js');
    return mod.createAuthManager;
  }

  it('returns cached token when valid', async () => {
    const createAuthManager = await loadAuthManager();
    const tokenStore = {
      load: vi.fn().mockResolvedValue({
        accessToken: 'valid_token_1234567890123',
        expiresIn: 3600,
        createdAt: Date.now(),
      }),
      save: vi.fn(),
      clear: vi.fn(),
    };

    const manager = createAuthManager({
      tokenStore,
      configStore: { load: vi.fn(), save: vi.fn(), get: vi.fn(), set: vi.fn(), unset: vi.fn(), getPath: vi.fn() },
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });

    await expect(manager.getAccessToken()).resolves.toBe('valid_token_1234567890123');
  });

  it('throws AuthRequiredError when no cached token exists', async () => {
    const createAuthManager = await loadAuthManager();
    const manager = createAuthManager({
      tokenStore: { load: vi.fn().mockResolvedValue(null), save: vi.fn(), clear: vi.fn() },
      configStore: { load: vi.fn(), save: vi.fn(), get: vi.fn(), set: vi.fn(), unset: vi.fn(), getPath: vi.fn() },
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });

    await expect(manager.getAccessToken()).rejects.toMatchObject({
      name: 'AuthRequiredError',
    });
  });

  it('falls back to env token when cache is missing', async () => {
    process.env.META_ACCESS_TOKEN = 'env_token_1234567890123';
    const createAuthManager = await loadAuthManager();
    const manager = createAuthManager({
      tokenStore: { load: vi.fn().mockResolvedValue(null), save: vi.fn(), clear: vi.fn() },
      configStore: { load: vi.fn(), save: vi.fn(), get: vi.fn(), set: vi.fn(), unset: vi.fn(), getPath: vi.fn() },
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });

    await expect(manager.getAccessToken()).resolves.toBe('env_token_1234567890123');
  });

  it('throws AuthRequiredError when cached token is expired', async () => {
    const createAuthManager = await loadAuthManager();
    const manager = createAuthManager({
      tokenStore: {
        load: vi.fn().mockResolvedValue({
          accessToken: 'expired_token_1234567890123',
          expiresIn: 1,
          createdAt: Date.now() - 10_000,
        }),
        save: vi.fn(),
        clear: vi.fn(),
      },
      configStore: { load: vi.fn(), save: vi.fn(), get: vi.fn(), set: vi.fn(), unset: vi.fn(), getPath: vi.fn() },
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });

    await expect(manager.getAccessToken()).rejects.toMatchObject({
      name: 'AuthRequiredError',
    });
  });

  it('invalidates token by clearing cache and warning', async () => {
    const createAuthManager = await loadAuthManager();
    const clear = vi.fn().mockResolvedValue(undefined);
    const warn = vi.fn();

    const manager = createAuthManager({
      tokenStore: { load: vi.fn(), save: vi.fn(), clear },
      configStore: { load: vi.fn(), save: vi.fn(), get: vi.fn(), set: vi.fn(), unset: vi.fn(), getPath: vi.fn() },
      logger: { debug: vi.fn(), info: vi.fn(), warn, error: vi.fn() },
    });

    await manager.invalidateToken();

    expect(clear).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('Token invalidated. Run: lanbow-ads auth login');
  });

  it('returns env auth state when META_ACCESS_TOKEN exists', async () => {
    process.env.META_ACCESS_TOKEN = 'env_token_1234567890123';
    const createAuthManager = await loadAuthManager();

    const manager = createAuthManager({
      tokenStore: { load: vi.fn().mockResolvedValue(null), save: vi.fn(), clear: vi.fn() },
      configStore: { load: vi.fn(), save: vi.fn(), get: vi.fn(), set: vi.fn(), unset: vi.fn(), getPath: vi.fn() },
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });

    const state = await manager.getAuthState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.source).toBe('env');
  });

  it('prefers cached auth state over env token when both exist', async () => {
    process.env.META_ACCESS_TOKEN = 'env_token_1234567890123';
    const createAuthManager = await loadAuthManager();

    const manager = createAuthManager({
      tokenStore: {
        load: vi.fn().mockResolvedValue({
          accessToken: 'cached_token_1234567890123',
          expiresIn: 3600,
          createdAt: Date.now(),
        }),
        save: vi.fn(),
        clear: vi.fn(),
      },
      configStore: { load: vi.fn(), save: vi.fn(), get: vi.fn(), set: vi.fn(), unset: vi.fn(), getPath: vi.fn() },
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });

    const state = await manager.getAuthState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.source).toBe('file');
  });
});
