import { describe, expect, it, vi } from 'vitest';

import { INSTAGRAM_ACCOUNT_FIELDS, PAGE_FIELDS } from '../../src/types/fields.js';
import { createPageService } from '../../src/services/page.service.js';

describe('page.service', () => {
  function buildDeps() {
    return {
      client: {
        getList: vi.fn().mockResolvedValue({ data: [] }),
        getObject: vi.fn(),
        post: vi.fn(),
        postFormData: vi.fn(),
        delete: vi.fn(),
      },
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    };
  }

  it('lists pages from me/accounts with default params', async () => {
    const deps = buildDeps();
    const service = createPageService(deps);

    await service.list();

    expect(deps.client.getList).toHaveBeenCalledWith('me/accounts', {
      fields: PAGE_FIELDS.join(','),
      limit: 25,
    });
  });

  it('passes custom fields and pagination params', async () => {
    const deps = buildDeps();
    const service = createPageService(deps);

    await service.list({
      fields: ['id', 'name'],
      limit: 10,
      after: 'cursor_next',
      before: 'cursor_prev',
    });

    expect(deps.client.getList).toHaveBeenCalledWith('me/accounts', {
      fields: 'id,name',
      limit: 10,
      after: 'cursor_next',
      before: 'cursor_prev',
    });
  });

  it('returns Instagram account when linked', async () => {
    const deps = buildDeps();
    deps.client.getObject.mockResolvedValue({
      instagram_business_account: {
        id: '17841400123456789',
        username: 'mybrand',
      },
    });
    const service = createPageService(deps);

    const result = await service.getInstagramAccount('123456789');

    expect(deps.client.getObject).toHaveBeenCalledWith('123456789', {
      fields: `instagram_business_account{${INSTAGRAM_ACCOUNT_FIELDS.join(',')}}`,
    });
    expect(result).toEqual({
      id: '17841400123456789',
      username: 'mybrand',
    });
  });

  it('returns null when Instagram account is not linked', async () => {
    const deps = buildDeps();
    deps.client.getObject.mockResolvedValue({ id: '123456789' });
    const service = createPageService(deps);

    await expect(service.getInstagramAccount('123456789')).resolves.toBeNull();
  });
});
