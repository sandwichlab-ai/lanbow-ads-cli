import os from 'node:os';
import path from 'node:path';

const APP_NAME = 'lanbow-ads';

export function getConfigDir(): string {
  switch (process.platform) {
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Application Support', APP_NAME);
    case 'win32':
      return path.join(process.env.APPDATA ?? os.homedir(), APP_NAME);
    default:
      return path.join(process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config'), APP_NAME);
  }
}

export function getCacheDir(): string {
  switch (process.platform) {
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Caches', APP_NAME);
    case 'win32':
      return path.join(process.env.LOCALAPPDATA ?? os.homedir(), APP_NAME);
    default:
      return path.join(process.env.XDG_CACHE_HOME ?? path.join(os.homedir(), '.cache'), APP_NAME);
  }
}
