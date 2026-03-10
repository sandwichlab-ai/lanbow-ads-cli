import { describe, expect, it, vi } from 'vitest';

import { createImageService } from '../../src/services/image.service.js';

describe('image.service', () => {
  function buildDeps() {
    return {
      client: {
        getList: vi.fn(),
        getObject: vi.fn(),
        post: vi.fn(),
        postFormData: vi.fn(),
        delete: vi.fn(),
      },
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    };
  }

  it('uploads image bytes and normalizes response payload', async () => {
    const deps = buildDeps();
    deps.client.post.mockResolvedValue({
      images: {
        'banner.jpg': {
          hash: 'img_hash_1',
          url: 'https://example.com/banner.jpg',
          name: 'banner.jpg',
          width: 1200,
          height: 628,
        },
      },
    });

    const service = createImageService(deps);
    const result = await service.upload('123', {
      bytes: 'ZmFrZV9iYXNlNjQ=',
      name: 'banner.jpg',
    });

    expect(deps.client.post).toHaveBeenCalledWith('act_123/adimages', {
      bytes: 'ZmFrZV9iYXNlNjQ=',
      name: 'banner.jpg',
    });
    expect(result).toEqual({
      hash: 'img_hash_1',
      url: 'https://example.com/banner.jpg',
      name: 'banner.jpg',
      width: 1200,
      height: 628,
    });
  });

  it('throws when API returns empty images object', async () => {
    const deps = buildDeps();
    deps.client.post.mockResolvedValue({ images: {} });

    const service = createImageService(deps);

    await expect(service.upload('123', { bytes: 'Zm9v' })).rejects.toThrow(
      /Failed to upload image to act_123: No image data in API response/,
    );
  });
});
