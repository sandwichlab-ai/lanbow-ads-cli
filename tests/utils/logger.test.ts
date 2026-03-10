import { describe, expect, it, vi } from 'vitest';

import { createLogger } from '../../src/utils/logger.js';

describe('createLogger', () => {
  it('does not print debug when verbose=false', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = createLogger(false);

    logger.debug('hidden');

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('prints debug when verbose=true', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = createLogger(true);

    logger.debug('visible');

    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('always prints info/warn/error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = createLogger(false);

    logger.info('i');
    logger.warn('w');
    logger.error('e');

    expect(spy).toHaveBeenCalledTimes(3);
    spy.mockRestore();
  });
});
