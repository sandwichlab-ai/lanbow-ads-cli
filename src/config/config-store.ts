import fs from 'node:fs/promises';
import path from 'node:path';

import { CLIError } from '../client/errors.js';
import type { AppConfig } from '../types/config.js';
import { getConfigDir } from '../utils/platform.js';
import { ALL_CONFIG_KEYS, AppConfigSchema } from './config-schema.js';

export interface ConfigStore {
  load(): Promise<AppConfig>;
  save(config: AppConfig): Promise<void>;
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  unset(key: string): Promise<void>;
  getPath(): string;
}

export function createConfigStore(): ConfigStore {
  const configPath = path.join(getConfigDir(), 'config.json');

  return {
    async load(): Promise<AppConfig> {
      try {
        const raw = await fs.readFile(configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        return AppConfigSchema.parse(parsed);
      } catch {
        return {};
      }
    },

    async save(config: AppConfig): Promise<void> {
      const dir = path.dirname(configPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
    },

    async get(key: string): Promise<unknown> {
      const config = await this.load();
      return config[key as keyof AppConfig];
    },

    async set(key: string, value: unknown): Promise<void> {
      if (!ALL_CONFIG_KEYS.includes(key as (typeof ALL_CONFIG_KEYS)[number])) {
        throw new CLIError(`Unknown config key: "${key}". Valid keys: ${ALL_CONFIG_KEYS.join(', ')}`);
      }
      const config = await this.load();
      (config as Record<string, unknown>)[key] = value;
      await this.save(config);
    },

    async unset(key: string): Promise<void> {
      const config = await this.load();
      delete (config as Record<string, unknown>)[key];
      await this.save(config);
    },

    getPath() {
      return configPath;
    },
  };
}
