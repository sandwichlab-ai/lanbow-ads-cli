import { spawn } from 'node:child_process';

import { AuthRequiredError, CLIError } from '../client/errors.js';
import type { TokenInfo, AuthState } from '../types/auth.js';
import type { ConfigStore } from '../config/config-store.js';
import type { Logger } from '../utils/logger.js';
import type { TokenStore } from './token-store.js';
import { buildOAuthUrl, startOAuthServer } from './oauth-server.js';
import { exchangeForLongLivedToken } from './token-exchange.js';

interface AuthManagerDeps {
  tokenStore: TokenStore;
  configStore: ConfigStore;
  logger: Logger;
}

export interface AuthManager {
  getAccessToken(): Promise<string>;
  getAuthState(): Promise<AuthState>;
  login(options?: { forceRefresh?: boolean }): Promise<TokenInfo>;
  logout(): Promise<void>;
  invalidateToken(): Promise<void>;
}

function isTokenExpired(token: TokenInfo): boolean {
  if (!token.expiresIn) {
    return false;
  }

  const expiresAtMs = token.createdAt + token.expiresIn * 1000;
  return Date.now() >= expiresAtMs;
}

function isTokenLikelyValid(token: string): boolean {
  return token.length >= 20;
}

function openExternalUrl(url: string): void {
  const platform = process.platform;

  try {
    if (platform === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
      return;
    }
    if (platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
      return;
    }

    spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
  } catch {
    // ignore open failures and fallback to manual copy
  }
}

export function createAuthManager(deps: AuthManagerDeps): AuthManager {
  return {
    async getAccessToken(): Promise<string> {
      const token = await deps.tokenStore.load();
      if (token && isTokenLikelyValid(token.accessToken) && !isTokenExpired(token)) {
        return token.accessToken;
      }

      const envToken = process.env.META_ACCESS_TOKEN;
      if (envToken && isTokenLikelyValid(envToken)) {
        return envToken;
      }

      throw new AuthRequiredError('No access token. Run: lanbow-ads auth login', 190);
    },

    async getAuthState(): Promise<AuthState> {
      const token = await deps.tokenStore.load();
      if (token && isTokenLikelyValid(token.accessToken) && !isTokenExpired(token)) {
        const expiresAt = token.expiresIn ? new Date(token.createdAt + token.expiresIn * 1000) : undefined;
        return {
          isAuthenticated: true,
          source: 'file',
          token,
          expiresAt,
        };
      }

      const envToken = process.env.META_ACCESS_TOKEN;
      if (envToken && isTokenLikelyValid(envToken)) {
        return {
          isAuthenticated: true,
          source: 'env',
        };
      }

      return {
        isAuthenticated: false,
        source: 'none',
      };
    },

    async login(options?: { forceRefresh?: boolean }): Promise<TokenInfo> {
      if (!options?.forceRefresh) {
        const existing = await deps.tokenStore.load();
        if (existing && !isTokenExpired(existing) && isTokenLikelyValid(existing.accessToken)) {
          return existing;
        }
      }

      const config = await deps.configStore.load();
      const appId = config.meta_app_id ?? process.env.META_APP_ID;
      const appSecret = config.meta_app_secret ?? process.env.META_APP_SECRET;

      if (!appId) {
        throw new CLIError('App ID required. Run: lanbow-ads config set --app-id YOUR_APP_ID');
      }

      const disableCallbackServer =
        config.meta_ads_disable_callback_server === true || process.env.META_ADS_DISABLE_CALLBACK_SERVER === '1';

      if (disableCallbackServer) {
        throw new CLIError('Callback server disabled; interactive token paste flow is not implemented in this build.');
      }

      const oauthServer = await startOAuthServer();
      const oauthUrl = buildOAuthUrl(appId, oauthServer.url);
      console.log(`Open this URL to authenticate:\n${oauthUrl}`);
      openExternalUrl(oauthUrl);

      try {
        const shortToken = await oauthServer.waitForCallback();
        let token: TokenInfo = {
          accessToken: shortToken.accessToken,
          expiresIn: shortToken.expiresIn,
          userId: shortToken.userId,
          createdAt: Date.now(),
        };

        if (appSecret) {
          try {
            const exchanged = await exchangeForLongLivedToken(shortToken.accessToken, appId, appSecret);
            token = {
              ...token,
              accessToken: exchanged.accessToken,
              expiresIn: exchanged.expiresIn,
              createdAt: exchanged.createdAt,
            };
          } catch (error) {
            deps.logger.warn(`Failed to exchange for long-lived token: ${(error as Error).message}`);
          }
        }

        await deps.tokenStore.save(token);
        return token;
      } finally {
        oauthServer.close();
      }
    },

    async logout(): Promise<void> {
      await deps.tokenStore.clear();
    },

    async invalidateToken(): Promise<void> {
      await deps.tokenStore.clear();
      deps.logger.warn('Token invalidated. Run: lanbow-ads auth login');
    },
  };
}
