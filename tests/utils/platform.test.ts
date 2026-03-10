import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { getCacheDir, getConfigDir } from '../../src/utils/platform.js';

const originalEnv = {
  APPDATA: process.env.APPDATA,
  LOCALAPPDATA: process.env.LOCALAPPDATA,
  XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
  XDG_CACHE_HOME: process.env.XDG_CACHE_HOME,
};

afterEach(() => {
  process.env.APPDATA = originalEnv.APPDATA;
  process.env.LOCALAPPDATA = originalEnv.LOCALAPPDATA;
  process.env.XDG_CONFIG_HOME = originalEnv.XDG_CONFIG_HOME;
  process.env.XDG_CACHE_HOME = originalEnv.XDG_CACHE_HOME;
});

describe('platform path helpers', () => {
  it('uses XDG paths on linux-like platforms', () => {
    process.env.XDG_CONFIG_HOME = '/tmp/xdg-config';
    process.env.XDG_CACHE_HOME = '/tmp/xdg-cache';

    if (process.platform !== 'win32' && process.platform !== 'darwin') {
      expect(getConfigDir()).toBe(path.join('/tmp/xdg-config', 'lanbow-ads'));
      expect(getCacheDir()).toBe(path.join('/tmp/xdg-cache', 'lanbow-ads'));
    }
  });

  it('falls back to home directory when XDG vars are missing', () => {
    if (process.platform !== 'win32' && process.platform !== 'darwin') {
      delete process.env.XDG_CONFIG_HOME;
      delete process.env.XDG_CACHE_HOME;

      expect(getConfigDir()).toBe(path.join(os.homedir(), '.config', 'lanbow-ads'));
      expect(getCacheDir()).toBe(path.join(os.homedir(), '.cache', 'lanbow-ads'));
    }
  });
});
