import { describe, expect, it, vi } from 'vitest';

import { createAdService } from '../../src/services/ad.service.js';

describe('ad.service', () => {
  function buildDeps() {
    return {
      client: {
        getList: vi.fn().mockResolvedValue({ data: [] }),
        getObject: vi.fn().mockResolvedValue({ id: 'ad_1' }),
        post: vi.fn().mockResolvedValue({ id: 'ad_1', success: true }),
        postFormData: vi.fn(),
        delete: vi.fn(),
      },
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    };
  }

  it('creates ad and wraps creative_id as creative object', async () => {
    const deps = buildDeps();
    const service = createAdService(deps);

    await service.create('123', {
      name: 'Ad Create',
      adset_id: 'adset_1',
      status: 'PAUSED',
      creative_id: 'crt_123',
      tracking_specs: [{ 'action.type': ['offsite_conversion'], fb_pixel: ['123'] }],
    });

    const [endpoint, params] = deps.client.post.mock.calls[0] as [string, Record<string, unknown>];
    expect(endpoint).toBe('act_123/ads');
    expect(params.creative).toEqual({ creative_id: 'crt_123' });
    expect(params.tracking_specs).toEqual([
      { 'action.type': ['offsite_conversion'], fb_pixel: ['123'] },
    ]);
  });

  it('updates ad with creative wrapper and mutable fields', async () => {
    const deps = buildDeps();
    const service = createAdService(deps);

    await service.update('ad_1', {
      status: 'PAUSED',
      creative_id: 'crt_999',
      bid_amount: 200,
    });

    expect(deps.client.post).toHaveBeenCalledWith('ad_1', {
      status: 'PAUSED',
      bid_amount: 200,
      creative: { creative_id: 'crt_999' },
    });
  });
});
