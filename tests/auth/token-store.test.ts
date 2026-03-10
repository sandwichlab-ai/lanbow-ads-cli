import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('token-store', () => {
  let tmpDir: string;

  beforeEach(async () => {
    vi.resetModules();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'meta-ads-token-'));
  });

  afterEach(async () => {
    vi.resetModules();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function loadStore() {
    vi.doMock('../../src/utils/platform.js', () => ({
      getConfigDir: () => tmpDir,
    }));

    const { createTokenStore } = await import('../../src/auth/token-store.js');
    return createTokenStore();
  }

  it('returns null when token cache does not exist', async () => {
    const store = await loadStore();
    await expect(store.load()).resolves.toBeNull();
  });

  it('saves token as snake_case and loads as camelCase', async () => {
    const store = await loadStore();

    await store.save({
      accessToken: 'token_abc',
      expiresIn: 3600,
      userId: 'u_1',
      createdAt: 123,
    });

    const loaded = await store.load();
    expect(loaded).toEqual({
      accessToken: 'token_abc',
      expiresIn: 3600,
      userId: 'u_1',
      createdAt: 123,
    });

    const cachePath = path.join(tmpDir, 'token_cache.json');
    const raw = JSON.parse(await fs.readFile(cachePath, 'utf-8')) as Record<string, unknown>;
    expect(raw.access_token).toBe('token_abc');
    expect(raw.created_at).toBe(123);
  });

  it('returns null for corrupted token cache', async () => {
    const store = await loadStore();
    const cachePath = path.join(tmpDir, 'token_cache.json');

    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, '{bad json');

    await expect(store.load()).resolves.toBeNull();
  });

  it('clear removes cache and ignores missing file', async () => {
    const store = await loadStore();

    await store.save({ accessToken: 'x', createdAt: Date.now() });
    await store.clear();
    await expect(store.load()).resolves.toBeNull();

    await expect(store.clear()).resolves.toBeUndefined();
  });
});
