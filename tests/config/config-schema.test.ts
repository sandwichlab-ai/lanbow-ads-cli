import { describe, expect, it } from 'vitest';

import {
  ALL_CONFIG_KEYS,
  BOOLEAN_KEYS,
  CLI_OPTION_MAP,
  CONFIG_ENV_MAP,
  FILE_ONLY_KEYS,
  SENSITIVE_KEYS,
  maskSensitiveValue,
  parseBooleanValue,
} from '../../src/config/config-schema.js';

describe('config-schema helpers', () => {
  it('contains expected key maps', () => {
    expect(CONFIG_ENV_MAP.meta_app_id).toBe('META_APP_ID');
    expect(CONFIG_ENV_MAP.meta_access_token).toBeUndefined();
    expect(FILE_ONLY_KEYS).toContain('default_account_id');
    expect(FILE_ONLY_KEYS).toContain('meta_access_token');
    expect(ALL_CONFIG_KEYS).toContain('meta_app_secret');
    expect(ALL_CONFIG_KEYS).toContain('accounts');
    expect(ALL_CONFIG_KEYS).toContain('meta_access_token');
    expect(CLI_OPTION_MAP['--app-id']).toBe('meta_app_id');
  });

  it('marks sensitive and boolean keys correctly', () => {
    expect(SENSITIVE_KEYS).toContain('meta_app_secret');
    expect(SENSITIVE_KEYS).toContain('meta_access_token');
    expect(BOOLEAN_KEYS).toContain('meta_ads_disable_callback_server');
  });

  it('masks sensitive values', () => {
    expect(maskSensitiveValue('12345678')).toBe('****');
    expect(maskSensitiveValue('123456789012')).toBe('1234...9012');
  });

  it('parses boolean env values', () => {
    expect(parseBooleanValue('1')).toBe(true);
    expect(parseBooleanValue('true')).toBe(true);
    expect(parseBooleanValue('YES')).toBe(true);
    expect(parseBooleanValue('on')).toBe(true);
    expect(parseBooleanValue('false')).toBe(false);
    expect(parseBooleanValue('0')).toBe(false);
  });
});
