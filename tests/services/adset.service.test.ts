import { describe, expect, it, vi } from 'vitest';

import { createAdSetService } from '../../src/services/adset.service.js';

describe('adset.service', () => {
  function buildDeps() {
    return {
      client: {
        getList: vi.fn().mockResolvedValue({ data: [] }),
        getObject: vi.fn().mockResolvedValue({ id: 'adset_1' }),
        post: vi.fn().mockResolvedValue({ id: 'adset_1', success: true }),
        postFormData: vi.fn(),
        delete: vi.fn(),
      },
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    };
  }

  it('lists adsets under provided parent id', async () => {
    const deps = buildDeps();
    const service = createAdSetService(deps);

    await service.list('cmp_1', { limit: 5 });

    expect(deps.client.getList).toHaveBeenCalledWith('cmp_1/adsets', {
      fields: expect.any(String),
      limit: 5,
    });
  });

  it('creates adset with required and optional params', async () => {
    const deps = buildDeps();
    const service = createAdSetService(deps);

    await service.create('123', {
      campaign_id: 'cmp_1',
      name: 'AdSet Create',
      optimization_goal: 'LINK_CLICKS',
      billing_event: 'IMPRESSIONS',
      status: 'PAUSED',
      bid_strategy: 'LOWEST_COST_WITH_BID_CAP',
      bid_amount: 120,
      targeting: {
        geo_locations: { countries: ['US'] },
      },
    });

    const [endpoint, params] = deps.client.post.mock.calls[0] as [string, Record<string, unknown>];
    expect(endpoint).toBe('act_123/adsets');
    expect(params.campaign_id).toBe('cmp_1');
    expect(params.bid_amount).toBe(120);
    expect(params.targeting).toEqual({
      geo_locations: { countries: ['US'] },
      targeting_automation: { advantage_audience: 0 },
    });
  });

  it('updates adset with selected fields only', async () => {
    const deps = buildDeps();
    const service = createAdSetService(deps);

    await service.update('adset_1', {
      status: 'ACTIVE',
      targeting: { age_min: 18, age_max: 40 },
      frequency_control_specs: [{ event: 'IMPRESSIONS', interval_days: 7, max_frequency: 2 }],
    });

    expect(deps.client.post).toHaveBeenCalledWith('adset_1', {
      status: 'ACTIVE',
      targeting: {
        age_min: 18,
        age_max: 40,
        targeting_automation: { advantage_audience: 0 },
      },
      frequency_control_specs: [{ event: 'IMPRESSIONS', interval_days: 7, max_frequency: 2 }],
    });
  });

  it('keeps explicit targeting_automation when provided', async () => {
    const deps = buildDeps();
    const service = createAdSetService(deps);

    await service.create('123', {
      campaign_id: 'cmp_1',
      name: 'AdSet Advantage',
      optimization_goal: 'LINK_CLICKS',
      billing_event: 'IMPRESSIONS',
      status: 'PAUSED',
      targeting: {
        age_min: 18,
        age_max: 65,
        targeting_automation: { advantage_audience: 1 },
      },
    });

    const [, params] = deps.client.post.mock.calls[0] as [string, Record<string, unknown>];
    expect(params.targeting).toEqual({
      age_min: 18,
      age_max: 65,
      targeting_automation: { advantage_audience: 1 },
    });
  });
});
