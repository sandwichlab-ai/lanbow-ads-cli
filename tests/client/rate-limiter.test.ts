import { describe, expect, it, vi } from 'vitest';

import { createRateLimiter } from '../../src/client/rate-limiter.js';

describe('rate-limiter', () => {
  it('updates state from X-App-Usage fields', () => {
    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const limiter = createRateLimiter(logger);
    limiter.update({ call_count: 10, total_cputime: 20, total_time: 30 });

    const state = limiter.getState();
    expect(state.call_count).toBe(10);
    expect(state.total_cputime).toBe(20);
    expect(state.total_time).toBe(30);
    expect(state.lastChecked).toBeTypeOf('number');
  });

  it('warns when usage >= 80%', () => {
    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const limiter = createRateLimiter(logger);
    limiter.update({ call_count: 80, total_cputime: 20, total_time: 30 });

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('warns and errors when usage >= 95%', () => {
    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const limiter = createRateLimiter(logger);
    limiter.update({ call_count: 95, total_cputime: 10, total_time: 20 });

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
