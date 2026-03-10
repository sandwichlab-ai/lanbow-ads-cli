import { describe, expect, it } from 'vitest';

import { normalizeAccountId } from '../../src/utils/account.js';

describe('normalizeAccountId', () => {
  it('keeps act_ prefix unchanged', () => {
    expect(normalizeAccountId('act_123')).toBe('act_123');
  });

  it('adds act_ prefix for numeric/string ids', () => {
    expect(normalizeAccountId('123')).toBe('act_123');
  });
});
