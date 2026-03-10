import { describe, expect, it, vi } from 'vitest';

import { CREATIVE_FIELDS, CREATIVE_LIST_FIELDS } from '../../src/types/fields.js';
import { createCreativeService } from '../../src/services/creative.service.js';

describe('creative.service', () => {
  function buildDeps() {
    return {
      client: {
        getList: vi.fn().mockResolvedValue({ data: [] }),
        getObject: vi.fn().mockResolvedValue({ id: 'crt_1' }),
        post: vi.fn().mockResolvedValue({ id: 'crt_1', success: true }),
        postFormData: vi.fn(),
        delete: vi.fn(),
      },
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    };
  }

  it('lists creatives with lightweight fields', async () => {
    const deps = buildDeps();
    const service = createCreativeService(deps);

    await service.list('act_123');

    expect(deps.client.getList).toHaveBeenCalledWith('act_123/adcreatives', {
      fields: CREATIVE_LIST_FIELDS.join(','),
      limit: 25,
    });
  });

  it('gets creative with full detail field set', async () => {
    const deps = buildDeps();
    const service = createCreativeService(deps);

    await service.get('crt_123');

    expect(deps.client.getObject).toHaveBeenCalledWith('crt_123', {
      fields: CREATIVE_FIELDS.join(','),
    });
  });

  it('creates simple link creative and maps headline/cta correctly', async () => {
    const deps = buildDeps();
    const service = createCreativeService(deps);

    await service.create('123', {
      name: 'My Creative',
      page_id: 'page_1',
      image_hash: 'hash_1',
      link: 'https://example.com',
      message: 'Body text',
      headline: 'Headline text',
      description: 'Desc',
      call_to_action: 'LEARN_MORE',
      instagram_actor_id: 'ig_123',
    });

    expect(deps.client.post).toHaveBeenCalledWith('act_123/adcreatives', {
      name: 'My Creative',
      object_story_spec: {
        page_id: 'page_1',
        link_data: {
          image_hash: 'hash_1',
          link: 'https://example.com',
          message: 'Body text',
          name: 'Headline text',
          description: 'Desc',
          call_to_action: { type: 'LEARN_MORE' },
        },
      },
      instagram_actor_id: 'ig_123',
    });
  });

  it('creates simple video creative and maps fields into video_data', async () => {
    const deps = buildDeps();
    const service = createCreativeService(deps);

    await service.create('123', {
      name: 'Video Creative',
      page_id: 'page_2',
      video_id: 'vid_123',
      image_hash: 'thumb_hash',
      link: 'https://example.com/watch',
      message: 'Watch this',
      headline: 'Video Title',
      description: 'Video description',
      call_to_action: 'SHOP_NOW',
    });

    expect(deps.client.post).toHaveBeenCalledWith('act_123/adcreatives', {
      name: 'Video Creative',
      object_story_spec: {
        page_id: 'page_2',
        video_data: {
          video_id: 'vid_123',
          image_hash: 'thumb_hash',
          message: 'Watch this',
          title: 'Video Title',
          description: 'Video description',
          call_to_action: {
            type: 'SHOP_NOW',
            value: { link: 'https://example.com/watch' },
          },
        },
      },
    });
  });

  it('defaults video creative CTA to LEARN_MORE', async () => {
    const deps = buildDeps();
    const service = createCreativeService(deps);

    await service.create('123', {
      name: 'Video Creative Default CTA',
      page_id: 'page_3',
      video_id: 'vid_456',
      link: 'https://example.com/default-cta',
    });

    const [, params] = deps.client.post.mock.calls[0] as [string, Record<string, unknown>];
    expect(params.object_story_spec).toEqual({
      page_id: 'page_3',
      video_data: {
        video_id: 'vid_456',
        call_to_action: {
          type: 'LEARN_MORE',
          value: { link: 'https://example.com/default-cta' },
        },
      },
    });
  });

  it('updates creative name only', async () => {
    const deps = buildDeps();
    const service = createCreativeService(deps);

    await service.update('crt_123', { name: 'Renamed Creative' });

    expect(deps.client.post).toHaveBeenCalledWith('crt_123', { name: 'Renamed Creative' });
  });
});
