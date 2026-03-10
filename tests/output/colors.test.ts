import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { colorize, supportsColor } from '../../src/output/colors.js';

describe('output/colors', () => {
  const originalNoColor = process.env.NO_COLOR;
  const originalForceColor = process.env.FORCE_COLOR;
  const isTTYDescriptor = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');

  beforeEach(() => {
    delete process.env.NO_COLOR;
    delete process.env.FORCE_COLOR;
  });

  afterEach(() => {
    process.env.NO_COLOR = originalNoColor;
    process.env.FORCE_COLOR = originalForceColor;
    if (isTTYDescriptor) {
      Object.defineProperty(process.stdout, 'isTTY', isTTYDescriptor);
    }
  });

  it('disables color when NO_COLOR is set', () => {
    process.env.NO_COLOR = '1';
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });

    expect(supportsColor()).toBe(false);
    expect(colorize('x', 'red')).toBe('x');
  });

  it('forces color when FORCE_COLOR is set', () => {
    process.env.FORCE_COLOR = '1';
    Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true });

    expect(supportsColor()).toBe(true);
    expect(colorize('x', 'red')).toContain('\x1b[31m');
  });

  it('uses tty capability by default', () => {
    Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true });
    expect(supportsColor()).toBe(false);

    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
    expect(supportsColor()).toBe(true);
  });
});
