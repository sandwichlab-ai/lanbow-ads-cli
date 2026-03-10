import { describe, expect, it, vi } from 'vitest';

import { createCrudBase } from '../../src/services/crud-base.js';

describe('createCrudBase', () => {
  it('lists with default fields and limit', async () => {
    const client = {
      getList: vi.fn().mockResolvedValue({ data: [] }),
      getObject: vi.fn(),
      post: vi.fn(),
      postFormData: vi.fn(),
      delete: vi.fn(),
    };

    const base = createCrudBase<{ id: string }>({
      resource: 'campaigns',
      fields: ['id', 'name'],
      client,
    });

    await base.list('act_1');

    expect(client.getList).toHaveBeenCalledWith('act_1/campaigns', {
      fields: 'id,name',
      limit: 25,
    });
  });

  it('lists with pagination, status and extra params', async () => {
    const client = {
      getList: vi.fn().mockResolvedValue({ data: [] }),
      getObject: vi.fn(),
      post: vi.fn(),
      postFormData: vi.fn(),
      delete: vi.fn(),
    };

    const base = createCrudBase<{ id: string }>({
      resource: 'campaigns',
      fields: ['id', 'name'],
      client,
    });

    await base.list('act_1', {
      fields: ['id'],
      limit: 10,
      after: 'a1',
      before: 'b1',
      effectiveStatus: ['ACTIVE'],
      extraParams: { filtering: [{ field: 'objective', operator: 'IN', value: ['OUTCOME_SALES'] }] },
    });

    expect(client.getList).toHaveBeenCalledWith('act_1/campaigns', {
      fields: 'id',
      limit: 10,
      after: 'a1',
      before: 'b1',
      effective_status: ['ACTIVE'],
      filtering: [{ field: 'objective', operator: 'IN', value: ['OUTCOME_SALES'] }],
    });
  });

  it('gets object by id with configured fields', async () => {
    const client = {
      getList: vi.fn(),
      getObject: vi.fn().mockResolvedValue({ id: '123' }),
      post: vi.fn(),
      postFormData: vi.fn(),
      delete: vi.fn(),
    };

    const base = createCrudBase<{ id: string }>({
      resource: 'ads',
      fields: ['id', 'name'],
      client,
    });

    await base.get('123');

    expect(client.getObject).toHaveBeenCalledWith('123', { fields: 'id,name' });
  });
});
