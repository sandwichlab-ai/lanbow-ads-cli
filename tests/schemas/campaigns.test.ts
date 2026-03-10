import { describe, expect, it } from 'vitest';

import {
  CampaignCreateSchema,
  CampaignUpdateSchema,
} from '../../src/schemas/campaigns.js';

describe('Campaign schemas', () => {
  it('applies defaults for create input', () => {
    const parsed = CampaignCreateSchema.parse({
      name: 'Spring Sale',
      objective: 'OUTCOME_TRAFFIC',
    });

    expect(parsed.status).toBe('PAUSED');
    expect(parsed.special_ad_categories).toEqual([]);
  });

  it('rejects create input with both daily and lifetime budget', () => {
    expect(() =>
      CampaignCreateSchema.parse({
        name: 'Budget Clash',
        objective: 'OUTCOME_SALES',
        daily_budget: 1000,
        lifetime_budget: 2000,
      }),
    ).toThrow(/Cannot set both daily_budget and lifetime_budget/);
  });

  it('requires bid_cap for BID_CAP/COST_CAP strategies', () => {
    expect(() =>
      CampaignCreateSchema.parse({
        name: 'Bid Cap Campaign',
        objective: 'OUTCOME_TRAFFIC',
        bid_strategy: 'LOWEST_COST_WITH_BID_CAP',
      }),
    ).toThrow(/bid_cap required/);

    expect(() =>
      CampaignCreateSchema.parse({
        name: 'Cost Cap Campaign',
        objective: 'OUTCOME_TRAFFIC',
        bid_strategy: 'COST_CAP',
      }),
    ).toThrow(/bid_cap required/);
  });

  it('requires roas_average_floor for MIN_ROAS strategy', () => {
    expect(() =>
      CampaignCreateSchema.parse({
        name: 'ROAS Campaign',
        objective: 'OUTCOME_SALES',
        bid_strategy: 'LOWEST_COST_WITH_MIN_ROAS',
      }),
    ).toThrow(/roas_average_floor required/);
  });

  it('accepts partial update payloads', () => {
    const parsed = CampaignUpdateSchema.parse({
      status: 'ACTIVE',
      bid_constraints: { roas_average_floor: 20000 },
    });

    expect(parsed.status).toBe('ACTIVE');
    expect(parsed.bid_constraints?.roas_average_floor).toBe(20000);
  });
});
