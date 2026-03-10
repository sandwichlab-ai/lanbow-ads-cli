import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('config-store', () => {
  let tmpDir: string;

  beforeEach(async () => {
    vi.resetModules();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'meta-ads-config-'));
  });

  afterEach(async () => {
    vi.resetModules();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function loadStore() {
    vi.doMock('../../src/utils/platform.js', () => ({
      getConfigDir: () => tmpDir,
    }));
    const mod = await import('../../src/config/config-store.js');
    return mod.createConfigStore();
  }

  it('returns empty object when config file does not exist', async () => {
    const store = await loadStore();
    await expect(store.load()).resolves.toEqual({});
  });

  it('saves and loads config json', async () => {
    const store = await loadStore();

    await store.save({
      meta_app_id: 'app_123',
      default_account_id: 'act_1',
    });

    await expect(store.load()).resolves.toMatchObject({
      meta_app_id: 'app_123',
      default_account_id: 'act_1',
    });
  });

  it('returns empty object when config file is invalid json', async () => {
    const store = await loadStore();
    const cfgPath = store.getPath();
    await fs.mkdir(path.dirname(cfgPath), { recursive: true });
    await fs.writeFile(cfgPath, '{broken-json');

    await expect(store.load()).resolves.toEqual({});
  });

  it('sets known keys and merges existing values', async () => {
    const store = await loadStore();

    await store.set('meta_app_id', 'app_x');
    await store.set('default_account_id', 'act_42');

    await expect(store.load()).resolves.toMatchObject({
      meta_app_id: 'app_x',
      default_account_id: 'act_42',
    });
  });

  it('rejects unknown keys on set', async () => {
    const store = await loadStore();

    await expect(store.set('not_a_key', 'x')).rejects.toThrow(/Unknown config key/);
  });

  it('unsets a key from file config', async () => {
    const store = await loadStore();
    await store.save({ meta_app_id: 'app_1', default_account_id: 'act_1' });

    await store.unset('meta_app_id');
    await expect(store.load()).resolves.toEqual({ default_account_id: 'act_1' });
  });
});
