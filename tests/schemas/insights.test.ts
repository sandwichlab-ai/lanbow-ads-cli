import { describe, expect, it } from 'vitest';

import { InsightsParamsSchema } from '../../src/schemas/insights.js';

describe('Insights schema', () => {
  it('accepts date_preset query', () => {
    const parsed = InsightsParamsSchema.parse({
      level: 'campaign',
      date_preset: 'last_30d',
      limit: 25,
    });

    expect(parsed.date_preset).toBe('last_30d');
  });

  it('rejects date_preset with time_range together', () => {
    expect(() =>
      InsightsParamsSchema.parse({
        date_preset: 'last_7d',
        time_range: { since: '2026-01-01', until: '2026-01-31' },
      }),
    ).toThrow(/Cannot set both date_preset and time_range/);
  });

  it('rejects invalid date format in time_range', () => {
    expect(() =>
      InsightsParamsSchema.parse({
        time_range: { since: '2026/01/01', until: '2026-01-31' },
      }),
    ).toThrow();
  });

  it('rejects limit > 100', () => {
    expect(() =>
      InsightsParamsSchema.parse({
        limit: 101,
      }),
    ).toThrow();
  });

  it('accepts numeric and symbolic time_increment', () => {
    const monthly = InsightsParamsSchema.parse({ time_increment: 'monthly' });
    const numeric = InsightsParamsSchema.parse({ time_increment: 7 });

    expect(monthly.time_increment).toBe('monthly');
    expect(numeric.time_increment).toBe(7);
  });
});
