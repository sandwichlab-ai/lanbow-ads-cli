import fs from 'node:fs/promises';
import path from 'node:path';

import type { TokenInfo } from '../types/auth.js';
import { getConfigDir } from '../utils/platform.js';

interface SerializedToken {
  access_token: string;
  expires_in?: number;
  user_id?: string;
  created_at: number;
}

export interface TokenStore {
  load(): Promise<TokenInfo | null>;
  save(token: TokenInfo): Promise<void>;
  clear(): Promise<void>;
}

function getTokenCachePath(): string {
  return path.join(getConfigDir(), 'token_cache.json');
}

export function createTokenStore(): TokenStore {
  const cachePath = getTokenCachePath();

  return {
    async load(): Promise<TokenInfo | null> {
      try {
        const data = await fs.readFile(cachePath, 'utf-8');
        const parsed = JSON.parse(data) as SerializedToken;
        return {
          accessToken: parsed.access_token,
          expiresIn: parsed.expires_in,
          userId: parsed.user_id,
          createdAt: parsed.created_at,
        };
      } catch {
        return null;
      }
    },

    async save(token: TokenInfo): Promise<void> {
      const dir = path.dirname(cachePath);
      await fs.mkdir(dir, { recursive: true });

      const serialized: SerializedToken = {
        access_token: token.accessToken,
        expires_in: token.expiresIn,
        user_id: token.userId,
        created_at: token.createdAt,
      };

      await fs.writeFile(cachePath, JSON.stringify(serialized, null, 2), { mode: 0o600 });
    },

    async clear(): Promise<void> {
      try {
        await fs.unlink(cachePath);
      } catch {
        // ignore missing cache
      }
    },
  };
}
