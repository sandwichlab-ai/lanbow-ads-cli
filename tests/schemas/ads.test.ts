import { describe, expect, it } from 'vitest';

import { AdCreateSchema, AdUpdateSchema } from '../../src/schemas/ads.js';

describe('Ad schemas', () => {
  it('applies default status for create input', () => {
    const parsed = AdCreateSchema.parse({
      name: 'Ad 1',
      adset_id: 'adset_1',
    });

    expect(parsed.status).toBe('PAUSED');
  });

  it('accepts tracking_specs payload with action.type', () => {
    const parsed = AdCreateSchema.parse({
      name: 'Ad 2',
      adset_id: 'adset_2',
      tracking_specs: [{ 'action.type': ['offsite_conversion'], fb_pixel: ['123'] }],
    });

    expect(parsed.tracking_specs?.[0]?.['action.type']).toEqual(['offsite_conversion']);
  });

  it('rejects malformed tracking_specs payload', () => {
    expect(() =>
      AdCreateSchema.parse({
        name: 'Bad Ad',
        adset_id: 'adset_3',
        tracking_specs: [{ fb_pixel: ['123'] }],
      }),
    ).toThrow();
  });

  it('accepts partial updates including creative_id and bid_amount', () => {
    const parsed = AdUpdateSchema.parse({
      creative_id: 'crt_123',
      bid_amount: 150,
    });

    expect(parsed.creative_id).toBe('crt_123');
    expect(parsed.bid_amount).toBe(150);
  });
});
