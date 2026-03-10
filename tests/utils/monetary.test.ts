import { describe, expect, it } from 'vitest';

import { centsToAmount, formatMoney } from '../../src/utils/monetary.js';

describe('monetary utils', () => {
  it('converts cents to decimal amount for non-zero-decimal currency', () => {
    expect(centsToAmount(1050, 'USD')).toBe('10.50');
  });

  it('does not divide zero-decimal currencies', () => {
    expect(centsToAmount(1050, 'JPY')).toBe('1,050');
  });

  it('returns 0 for invalid numeric input', () => {
    expect(centsToAmount('not-a-number', 'USD')).toBe('0');
  });

  it('formats amount with ISO currency', () => {
    expect(formatMoney(2500, 'USD')).toBe('25.00 USD');
  });
});
