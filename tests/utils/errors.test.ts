import { describe, expect, it } from 'vitest';

import { enrichError } from '../../src/utils/errors.js';

describe('enrichError', () => {
  it('adds context and preserves error name + cause', () => {
    const original = new Error('Invalid parameter');
    original.name = 'GraphAPIError';

    const enriched = enrichError(original, 'Failed to create campaign');

    expect(enriched.message).toBe('Failed to create campaign: Invalid parameter');
    expect(enriched.name).toBe('GraphAPIError');
    expect(enriched.cause).toBe(original);
  });

  it('handles non-Error values', () => {
    const enriched = enrichError('boom', 'Operation failed');
    expect(enriched.message).toBe('Operation failed: boom');
  });
});
