import { describe, expect, it, vi } from 'vitest';

import { createInsightsService } from '../../src/services/insights.service.js';

describe('insights.service', () => {
  it('builds default insights params and endpoint', async () => {
    const deps = {
      client: {
        getList: vi.fn().mockResolvedValue({ data: [] }),
        getObject: vi.fn(),
        post: vi.fn(),
        postFormData: vi.fn(),
        delete: vi.fn(),
      },
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    };

    const service = createInsightsService(deps);

    await service.get('act_123', { level: 'campaign' });

    const [endpoint, params] = deps.client.getList.mock.calls[0] as [string, Record<string, unknown>];
    expect(endpoint).toBe('act_123/insights');
    expect(params.limit).toBe(25);
    expect(typeof params.fields).toBe('string');
    expect(params.level).toBe('campaign');
  });

  it('maps time range, breakdowns, sorting and attribution fields', async () => {
    const deps = {
      client: {
        getList: vi.fn().mockResolvedValue({ data: [] }),
        getObject: vi.fn(),
        post: vi.fn(),
        postFormData: vi.fn(),
        delete: vi.fn(),
      },
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    };

    const service = createInsightsService(deps);

    await service.get('cmp_1', {
      time_range: { since: '2026-01-01', until: '2026-01-31' },
      breakdowns: ['age', 'gender'],
      action_attribution_windows: ['1d_click', '7d_view'],
      sort: ['-spend'],
      filtering: [{ field: 'spend', operator: 'GREATER_THAN', value: ['100'] }],
      time_increment: 1,
      fields: ['campaign_name', 'spend'],
      limit: 10,
    });

    const [, params] = deps.client.getList.mock.calls[0] as [string, Record<string, unknown>];

    expect(params.time_range).toEqual({ since: '2026-01-01', until: '2026-01-31' });
    expect(params.breakdowns).toBe('age,gender');
    expect(params.action_attribution_windows).toEqual(['1d_click', '7d_view']);
    expect(params.sort).toEqual(['-spend']);
    expect(params.filtering).toEqual([
      { field: 'spend', operator: 'GREATER_THAN', value: ['100'] },
    ]);
    expect(params.time_increment).toBe(1);
    expect(params.fields).toBe('campaign_name,spend');
    expect(params.limit).toBe(10);
  });

  it('enriches errors with object context', async () => {
    const deps = {
      client: {
        getList: vi.fn().mockRejectedValue(new Error('api failed')),
        getObject: vi.fn(),
        post: vi.fn(),
        postFormData: vi.fn(),
        delete: vi.fn(),
      },
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    };

    const service = createInsightsService(deps);

    await expect(service.get('act_123', { level: 'account' })).rejects.toThrow(
      /Failed to get insights for act_123: api failed/,
    );
  });
});
