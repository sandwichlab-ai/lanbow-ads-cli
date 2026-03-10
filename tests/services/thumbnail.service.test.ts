import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createThumbnailService } from '../../src/services/thumbnail.service.js';

describe('thumbnail.service', () => {
  const originalFetch = global.fetch;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'meta-ads-thumbnail-service-'));
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    vi.useRealTimers();
    await rm(tempDir, { recursive: true, force: true });
  });

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

  it('uploads a user-provided thumbnail file and returns its image hash', async () => {
    const deps = buildDeps();
    deps.client.post.mockResolvedValue({
      images: {
        'thumb.jpg': {
          hash: 'img_hash_1',
          name: 'thumb.jpg',
        },
      },
    });

    const thumbnailPath = join(tempDir, 'thumb.jpg');
    await writeFile(thumbnailPath, Buffer.from('thumbnail-bytes'));

    const service = createThumbnailService(deps);
    const result = await service.resolve('123', 'vid_1', { thumbnailPath });

    expect(result).toEqual({ imageHash: 'img_hash_1' });
    expect(deps.client.post).toHaveBeenCalledWith('act_123/adimages', {
      bytes: Buffer.from('thumbnail-bytes').toString('base64'),
      name: 'thumb.jpg',
    });
    expect(deps.logger.warn).not.toHaveBeenCalled();
  });

  it('polls for ready status, downloads Meta thumbnail, and uploads it as an ad image', async () => {
    const deps = buildDeps();
    deps.client.getObject
      .mockResolvedValueOnce({ status: { video_status: 'ready' } })
      .mockResolvedValueOnce({
        thumbnails: {
          data: [{ uri: 'https://thumb.test/generated.jpg' }],
        },
      });
    deps.client.post.mockResolvedValue({
      images: {
        thumbnail_vid_2: {
          hash: 'img_hash_2',
        },
      },
    });
    global.fetch = vi.fn().mockResolvedValue(
      new Response(Buffer.from('downloaded-thumb'), {
        status: 200,
      }),
    ) as unknown as typeof fetch;

    const service = createThumbnailService(deps);
    const result = await service.resolve('123', 'vid_2', { autoThumbnail: true });

    expect(result).toEqual({ imageHash: 'img_hash_2', videoStatus: 'ready' });
    expect(deps.client.getObject).toHaveBeenNthCalledWith(1, 'vid_2', { fields: 'status' });
    expect(deps.client.getObject).toHaveBeenNthCalledWith(2, 'vid_2', { fields: 'thumbnails' });
    expect(global.fetch).toHaveBeenCalledWith('https://thumb.test/generated.jpg', {
      signal: expect.any(AbortSignal),
    });
    expect(deps.client.post).toHaveBeenCalledWith('act_123/adimages', {
      bytes: Buffer.from('downloaded-thumb').toString('base64'),
      name: 'thumbnail_vid_2',
    });
  });

  it('returns ready status and warns when auto-thumbnail extraction fails after polling', async () => {
    const deps = buildDeps();
    deps.client.getObject
      .mockResolvedValueOnce({ status: { video_status: 'ready' } })
      .mockResolvedValueOnce({
        thumbnails: {
          data: [{ uri: 'https://thumb.test/broken.jpg' }],
        },
      });
    global.fetch = vi.fn().mockResolvedValue(new Response('oops', { status: 503 })) as unknown as typeof fetch;

    const service = createThumbnailService(deps);
    const result = await service.resolve('123', 'vid_3', { autoThumbnail: true });

    expect(result).toEqual({ videoStatus: 'ready' });
    expect(deps.logger.warn).toHaveBeenCalledWith(
      'Thumbnail extraction failed (video_id vid_3 is still valid): Failed to download thumbnail: HTTP 503',
    );
  });

  it('warns and returns empty result when video never becomes ready', async () => {
    vi.useFakeTimers();

    const deps = buildDeps();
    deps.client.getObject.mockResolvedValue({ status: { video_status: 'processing' } });

    const service = createThumbnailService(deps);
    const promise = service.resolve('123', 'vid_4', { autoThumbnail: true });

    await vi.advanceTimersByTimeAsync(120_000);
    await expect(promise).resolves.toEqual({});

    expect(deps.logger.warn).toHaveBeenCalledWith(
      'Thumbnail extraction failed (video_id vid_4 is still valid): Video processing timed out after 120s',
    );
  });
});
