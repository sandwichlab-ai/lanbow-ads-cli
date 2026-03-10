import type { Command } from 'commander';

import { exchangeForLongLivedToken } from '../auth/token-exchange.js';
import { createTokenStore } from '../auth/token-store.js';
import { createConfigStore } from '../config/config-store.js';
import { CLIError } from '../client/errors.js';

import type { CommandDeps } from './shared.js';
import { runCommand } from './shared.js';

async function handleAuthLogin(deps: CommandDeps, options: { force?: boolean }): Promise<void> {
  const token = await deps.authManager.login({ forceRefresh: options.force });

  console.log('Authenticated successfully.');
  if (token.expiresIn) {
    const days = Math.floor(token.expiresIn / 86400);
    console.log(`Token expires in ${days} days.`);
  }
}

async function handleAuthLogout(deps: CommandDeps): Promise<void> {
  await deps.authManager.logout();
  console.log('Logged out. Token cache cleared.');
}

async function handleAuthExchange(_deps: CommandDeps, options: { token: string }): Promise<void> {
  const configStore = createConfigStore();
  const config = await configStore.load();
  const appId = config.meta_app_id ?? process.env.META_APP_ID;
  const appSecret = config.meta_app_secret ?? process.env.META_APP_SECRET;

  if (!appId) {
    throw new CLIError('App ID required. Run: lanbow config set --app-id YOUR_APP_ID');
  }
  if (!appSecret) {
    throw new CLIError('App secret required. Run: lanbow config set --app-secret YOUR_APP_SECRET');
  }

  const result = await exchangeForLongLivedToken(options.token, appId, appSecret);
  const tokenStore = createTokenStore();
  await tokenStore.save(result);

  console.log('Token exchanged successfully.');
  if (result.expiresIn) {
    const days = Math.floor(result.expiresIn / 86400);
    console.log(`Token expires in ${days} days.`);
  }
}

async function handleAuthStatus(deps: CommandDeps): Promise<void> {
  if (deps.config.meta_access_token) {
    const source = deps.config.sources.meta_access_token ?? 'file';
    console.log(`Authenticated via: ${source}`);
    return;
  }

  const state = await deps.authManager.getAuthState();

  if (state.isAuthenticated) {
    console.log(`Authenticated via: ${state.source}`);
    if (state.expiresAt) {
      console.log(`Expires: ${state.expiresAt.toISOString()}`);
    }
    if (state.token?.userId) {
      console.log(`User ID: ${state.token.userId}`);
    }
  } else {
    console.log('Not authenticated. Run: lanbow-ads auth login');
  }
}

export function registerAuthCommand(program: Command): void {
  const auth = program.command('auth').description('Authentication management');

  auth
    .command('login')
    .description('Login via OAuth flow')
    .option('--force', 'Force re-authentication')
    .action(runCommand(handleAuthLogin, { requireAuth: false }));

  auth
    .command('logout')
    .description('Clear cached authentication token')
    .action(runCommand(handleAuthLogout, { requireAuth: false }));

  auth
    .command('exchange')
    .description('Exchange a short-lived token for a long-lived token')
    .requiredOption('--token <token>', 'Short-lived access token to exchange')
    .action(runCommand(handleAuthExchange, { requireAuth: false }));

  auth
    .command('status')
    .description('Show current authentication status')
    .action(runCommand(handleAuthStatus, { requireAuth: false }));
}
