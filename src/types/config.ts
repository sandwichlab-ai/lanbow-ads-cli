export interface AppConfig {
  meta_app_id?: string;
  meta_app_secret?: string;
  meta_access_token?: string;
  default_account_id?: string;
  default_account_alias?: string;
  meta_ads_disable_callback_server?: boolean;
  meta_ads_disable_login_link?: boolean;
  accounts?: Record<string, AccountAlias>;
}

export interface AccountAlias {
  account_id: string;
  label?: string;
}

export type ConfigKey = keyof AppConfig;
export type ConfigSource = 'cli' | 'file' | 'env';

export interface ResolvedConfig extends AppConfig {
  sources: Partial<Record<ConfigKey, ConfigSource>>;
}
