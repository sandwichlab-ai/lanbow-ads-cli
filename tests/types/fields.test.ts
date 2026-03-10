import { describe, expect, it } from 'vitest';

import {
  ACCOUNT_FIELDS,
  ADSET_FIELDS,
  AD_FIELDS,
  CAMPAIGN_FIELDS,
  DSA_COUNTRIES,
  INSIGHTS_FIELDS,
} from '../../src/types/fields.js';

describe('types/fields constants', () => {
  it('contains key field lists used by services', () => {
    expect(CAMPAIGN_FIELDS).toContain('objective');
    expect(ADSET_FIELDS).toContain('targeting');
    expect(AD_FIELDS).toContain('creative');
    expect(ACCOUNT_FIELDS).toContain('currency');
    expect(INSIGHTS_FIELDS).toContain('spend');
  });

  it('contains expected DSA countries', () => {
    expect(DSA_COUNTRIES).toContain('DE');
    expect(DSA_COUNTRIES).toContain('FR');
  });
});
