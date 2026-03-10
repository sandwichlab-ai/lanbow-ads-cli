import { describe, expect, it } from 'vitest';

import { AppConfigSchema } from '../../src/schemas/config.js';

describe('Config schema', () => {
  it('validates account alias format', () => {
    const parsed = AppConfigSchema.parse({
      accounts: {
        prod: { account_id: 'act_1234567890', label: 'Production' },
      },
    });

    expect(parsed.accounts?.prod?.account_id).toBe('act_1234567890');
  });

  it('rejects invalid account alias id', () => {
    expect(() =>
      AppConfigSchema.parse({
        accounts: {
          prod: { account_id: '1234567890' },
        },
      }),
    ).toThrow();
  });

  it('keeps unknown keys (passthrough)', () => {
    const parsed = AppConfigSchema.parse({
      meta_app_id: 'app_1',
      future_key: 'future-value',
    });

    expect((parsed as Record<string, unknown>).future_key).toBe('future-value');
  });
});
