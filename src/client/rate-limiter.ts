import type { RateLimitInfo } from '../types/api.js';
import type { Logger } from '../utils/logger.js';

export interface RateLimitState {
  call_count: number;
  total_cputime: number;
  total_time: number;
  lastChecked: number;
}

export function createRateLimiter(logger: Logger): {
  update: (info: RateLimitInfo) => void;
  getState: () => RateLimitState;
} {
  let state: RateLimitState = {
    call_count: 0,
    total_cputime: 0,
    total_time: 0,
    lastChecked: Date.now(),
  };

  return {
    update(info: RateLimitInfo) {
      state = { ...info, lastChecked: Date.now() };

      const maxUsage = Math.max(info.call_count, info.total_cputime, info.total_time);
      if (maxUsage >= 80) {
        logger.warn(
          `Rate limit warning: ${maxUsage}% usage (calls: ${info.call_count}%, cpu: ${info.total_cputime}%, time: ${info.total_time}%)`,
        );
      }
      if (maxUsage >= 95) {
        logger.error('Rate limit critical: approaching 100%. Subsequent requests may fail.');
      }
    },

    getState() {
      return { ...state };
    },
  };
}
