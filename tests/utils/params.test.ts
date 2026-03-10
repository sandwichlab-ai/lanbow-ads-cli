import { describe, expect, it } from 'vitest';

import { pickDefined } from '../../src/utils/params.js';

describe('pickDefined', () => {
  it('returns only explicitly whitelisted defined keys', () => {
    const input = {
      name: 'Campaign',
      status: 'ACTIVE',
      daily_budget: undefined,
      lifetime_budget: 10000,
    };

    const picked = pickDefined(input, ['name', 'daily_budget', 'lifetime_budget']);

    expect(picked).toEqual({
      name: 'Campaign',
      lifetime_budget: 10000,
    });
  });
});
