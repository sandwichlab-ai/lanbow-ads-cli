import { describe, expect, it, vi } from 'vitest';

import type { CommandDeps } from '../../src/commands/shared.js';
import { handlePagesInstagram } from '../../src/commands/pages.cmd.js';

describe('pages command handler', () => {
  function buildDeps(tokenSource?: 'cli' | 'env' | 'file'): CommandDeps {
    return {
      config: {
        sources: tokenSource ? { meta_access_token: tokenSource } : {},
      } as CommandDeps['config'],
      authManager: {} as CommandDeps['authManager'],
      client: {
        getList: vi.fn(),
        getObject: vi.fn(),
        post: vi.fn(),
        postFormData: vi.fn(),
        delete: vi.fn(),
      },
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      formatter: { output: vi.fn() },
      createScopedClient: vi.fn(),
    };
  }

  it('outputs account via formatter when found', async () => {
    const deps = buildDeps();
    deps.client.getObject = vi.fn().mockResolvedValue({
      instagram_business_account: {
        id: '17841400123456789',
        username: 'mybrand',
      },
    });

    await handlePagesInstagram(deps, '123456789');

    expect(deps.formatter.output).toHaveBeenCalledWith(
      {
        id: '17841400123456789',
        username: 'mybrand',
      },
      { title: 'Instagram Account' },
    );
  });

  it('outputs status and OAuth hint via formatter when not found for OAuth user', async () => {
    const deps = buildDeps();
    deps.client.getObject = vi.fn().mockResolvedValue({ id: '123456789' });

    await handlePagesInstagram(deps, '123456789');

    expect(deps.formatter.output).toHaveBeenCalledWith(
      {
        page_id: '123456789',
        status: 'not_found',
        hint: expect.stringContaining('lanbow-ads auth login --force'),
      },
      { title: 'Instagram Account' },
    );
  });

  it.each(['env', 'file', 'cli'] as const)(
    'tailors not found hint for %s token users',
    async (tokenSource) => {
      const deps = buildDeps(tokenSource);
      deps.client.getObject = vi.fn().mockResolvedValue({ id: '123456789' });

      await handlePagesInstagram(deps, '123456789');

      expect(deps.formatter.output).toHaveBeenCalledWith(
        {
          page_id: '123456789',
          status: 'not_found',
          hint: expect.stringContaining(
            `Your token is provided via ${tokenSource}. Replace it with one that includes the instagram_basic permission.`,
          ),
        },
        { title: 'Instagram Account' },
      );
    },
  );
});
