import { describe, expect, it } from 'vitest';

import { AdSetCreateSchema, AdSetUpdateSchema } from '../../src/schemas/adsets.js';

describe('AdSet schemas', () => {
  it('applies default status for create input', () => {
    const parsed = AdSetCreateSchema.parse({
      campaign_id: 'cmp_1',
      name: 'AdSet 1',
      optimization_goal: 'LINK_CLICKS',
      billing_event: 'IMPRESSIONS',
    });

    expect(parsed.status).toBe('PAUSED');
  });

  it('rejects daily and lifetime budget set together', () => {
    expect(() =>
      AdSetCreateSchema.parse({
        campaign_id: 'cmp_1',
        name: 'Budget Clash',
        optimization_goal: 'LINK_CLICKS',
        billing_event: 'IMPRESSIONS',
        daily_budget: 1000,
        lifetime_budget: 5000,
      }),
    ).toThrow(/Cannot set both daily_budget and lifetime_budget/);
  });

  it('requires bid_amount for BID_CAP strategy', () => {
    expect(() =>
      AdSetCreateSchema.parse({
        campaign_id: 'cmp_1',
        name: 'Bid Cap',
        optimization_goal: 'LINK_CLICKS',
        billing_event: 'IMPRESSIONS',
        bid_strategy: 'LOWEST_COST_WITH_BID_CAP',
      }),
    ).toThrow(/bid_amount required/);
  });

  it('requires roas_average_floor for MIN_ROAS strategy', () => {
    expect(() =>
      AdSetCreateSchema.parse({
        campaign_id: 'cmp_1',
        name: 'ROAS',
        optimization_goal: 'LINK_CLICKS',
        billing_event: 'IMPRESSIONS',
        bid_strategy: 'LOWEST_COST_WITH_MIN_ROAS',
      }),
    ).toThrow(/roas_average_floor required/);
  });

  it('requires application_id + object_store_url for APP_INSTALLS', () => {
    expect(() =>
      AdSetCreateSchema.parse({
        campaign_id: 'cmp_1',
        name: 'App Install',
        optimization_goal: 'APP_INSTALLS',
        billing_event: 'IMPRESSIONS',
      }),
    ).toThrow(/promoted_object\.application_id \+ object_store_url required/);
  });

  it('allows targeting passthrough fields', () => {
    const parsed = AdSetCreateSchema.parse({
      campaign_id: 'cmp_1',
      name: 'Advanced Targeting',
      optimization_goal: 'LINK_CLICKS',
      billing_event: 'IMPRESSIONS',
      targeting: {
        geo_locations: { countries: ['US'] },
        flexible_spec: [{ interests: [{ id: '6003392754754', name: 'Nike, Inc.' }] }],
      },
    });

    expect(parsed.targeting?.flexible_spec).toBeDefined();
  });

  it('accepts frequency control specs in update', () => {
    const parsed = AdSetUpdateSchema.parse({
      frequency_control_specs: [{ event: 'IMPRESSIONS', interval_days: 7, max_frequency: 2 }],
    });

    expect(parsed.frequency_control_specs?.[0]?.event).toBe('IMPRESSIONS');
  });
});
