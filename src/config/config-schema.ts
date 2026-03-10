import { AppConfigSchema } from '../schemas/config.js';

export { AppConfigSchema };

export const CONFIG_ENV_MAP: Record<string, string> = {
  meta_app_id: 'META_APP_ID',
  meta_app_secret: 'META_APP_SECRET',
  meta_ads_disable_callback_server: 'META_ADS_DISABLE_CALLBACK_SERVER',
  meta_ads_disable_login_link: 'META_ADS_DISABLE_LOGIN_LINK',
};

export const FILE_ONLY_KEYS = ['meta_access_token', 'default_account_id', 'default_account_alias', 'accounts'] as const;

export const ALL_CONFIG_KEYS = [...Object.keys(CONFIG_ENV_MAP), ...FILE_ONLY_KEYS] as const;

export const CLI_OPTION_MAP: Record<string, string> = {
  '--app-id': 'meta_app_id',
  '--app-secret': 'meta_app_secret',
  '--account': 'default_account_id',
};

export const SENSITIVE_KEYS = ['meta_app_secret', 'meta_access_token'] as const;

export const BOOLEAN_KEYS = ['meta_ads_disable_callback_server', 'meta_ads_disable_login_link'] as const;

export function maskSensitiveValue(value: string): string {
  if (value.length <= 8) {
    return '****';
  }
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function parseBooleanValue(value: string): boolean {
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}
