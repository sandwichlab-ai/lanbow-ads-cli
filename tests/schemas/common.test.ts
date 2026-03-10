import { describe, expect, it } from 'vitest';

import { PaginationSchema } from '../../src/schemas/common.js';

describe('Common schemas', () => {
  it('applies pagination defaults', () => {
    const parsed = PaginationSchema.parse({});

    expect(parsed.limit).toBe(25);
    expect(parsed.all).toBe(false);
  });

  it('rejects pagination limit above 100', () => {
    expect(() => PaginationSchema.parse({ limit: 101 })).toThrow();
  });
});
