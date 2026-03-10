import { describe, expect, it, vi } from 'vitest';

import { createAccountService } from '../../src/services/account.service.js';

describe('account.service', () => {
  it('lists accounts from me/adaccounts with default fields', async () => {
    const deps = {
      client: {
        getList: vi.fn().mockResolvedValue({ data: [] }),
        getObject: vi.fn(),
        post: vi.fn(),
        postFormData: vi.fn(),
        delete: vi.fn(),
      },
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    };

    const service = createAccountService(deps);
    await service.list();

    expect(deps.client.getList).toHaveBeenCalledTimes(1);
    const [endpoint, params] = deps.client.getList.mock.calls[0] as [string, Record<string, unknown>];

    expect(endpoint).toBe('me/adaccounts');
    expect(params.limit).toBe(25);
    expect(typeof params.fields).toBe('string');
  });

  it('gets account by normalized act_ id', async () => {
    const deps = {
      client: {
        getList: vi.fn(),
        getObject: vi.fn().mockResolvedValue({ id: 'act_123' }),
        post: vi.fn(),
        postFormData: vi.fn(),
        delete: vi.fn(),
      },
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    };

    const service = createAccountService(deps);
    await service.get('123');

    expect(deps.client.getObject).toHaveBeenCalledWith('act_123', expect.any(Object));
  });

  it('enriches errors with business context', async () => {
    const deps = {
      client: {
        getList: vi.fn().mockRejectedValue(new Error('api down')),
        getObject: vi.fn(),
        post: vi.fn(),
        postFormData: vi.fn(),
        delete: vi.fn(),
      },
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    };

    const service = createAccountService(deps);
    await expect(service.list()).rejects.toThrow(/Failed to list ad accounts: api down/);
  });
});
