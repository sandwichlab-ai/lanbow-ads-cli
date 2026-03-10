import { describe, expect, it, vi } from 'vitest';

import { createCampaignService } from '../../src/services/campaign.service.js';

describe('campaign.service', () => {
  function buildDeps() {
    return {
      client: {
        getList: vi.fn().mockResolvedValue({ data: [] }),
        getObject: vi.fn().mockResolvedValue({ id: 'cmp_1' }),
        post: vi.fn().mockResolvedValue({ id: 'cmp_1', success: true }),
        postFormData: vi.fn(),
        delete: vi.fn(),
      },
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    };
  }

  it('adds objective filtering in list', async () => {
    const deps = buildDeps();
    const service = createCampaignService(deps);

    await service.list('123', { objective: 'OUTCOME_LEADS' });

    const [endpoint, params] = deps.client.getList.mock.calls[0] as [string, Record<string, unknown>];
    expect(endpoint).toBe('act_123/campaigns');
    expect(params.filtering).toEqual([
      { field: 'objective', operator: 'IN', value: ['OUTCOME_LEADS'] },
    ]);
  });

  it('omits campaign budget when use_adset_level_budgets=true', async () => {
    const deps = buildDeps();
    const service = createCampaignService(deps);

    await service.create('123', {
      name: 'ABO Campaign',
      objective: 'OUTCOME_TRAFFIC',
      status: 'PAUSED',
      special_ad_categories: [],
      daily_budget: 1000,
      use_adset_level_budgets: true,
    });

    const [endpoint, params] = deps.client.post.mock.calls[0] as [string, Record<string, unknown>];
    expect(endpoint).toBe('act_123/campaigns');
    expect(params.name).toBe('ABO Campaign');
    expect(params.special_ad_categories).toEqual([]);
    expect(params.daily_budget).toBeUndefined();
    expect(params.lifetime_budget).toBeUndefined();
    expect(params.is_adset_budget_sharing_enabled).toBe(false);
  });

  it('includes bid params when bid_strategy is set', async () => {
    const deps = buildDeps();
    const service = createCampaignService(deps);

    await service.create('act_123', {
      name: 'Bidding Campaign',
      objective: 'OUTCOME_TRAFFIC',
      status: 'PAUSED',
      bid_strategy: 'LOWEST_COST_WITH_BID_CAP',
      bid_cap: 150,
      special_ad_categories: [],
    });

    const [, params] = deps.client.post.mock.calls[0] as [string, Record<string, unknown>];
    expect(params.bid_strategy).toBe('LOWEST_COST_WITH_BID_CAP');
    expect(params.bid_cap).toBe(150);
  });

  it('updates only provided mutable fields', async () => {
    const deps = buildDeps();
    const service = createCampaignService(deps);

    await service.update('cmp_123', {
      status: 'PAUSED',
      bid_constraints: { roas_average_floor: 20000 },
    });

    expect(deps.client.post).toHaveBeenCalledWith('cmp_123', {
      status: 'PAUSED',
      bid_constraints: { roas_average_floor: 20000 },
    });
  });
});
