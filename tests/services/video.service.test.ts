import { mkdtemp, open, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CLIError, RateLimitError } from '../../src/client/errors.js';
import { createVideoService } from '../../src/services/video.service.js';

const CHUNKED_THRESHOLD = 20 * 1024 * 1024;

describe('video.service', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'meta-ads-video-service-'));
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await rm(tempDir, { recursive: true, force: true });
  });

  function buildDeps() {
    return {
      videoClient: {
        getList: vi.fn(),
        getObject: vi.fn(),
        post: vi.fn(),
        postFormData: vi.fn(),
        delete: vi.fn(),
      },
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      onProgress: vi.fn(),
    };
  }

  async function createSparseFile(filePath: string, content: string, size: number): Promise<void> {
    const handle = await open(filePath, 'w');
    try {
      await handle.writeFile(Buffer.from(content));
      await handle.truncate(size);
    } finally {
      await handle.close();
    }
  }

  it('uploads small videos as multipart form data', async () => {
    const deps = buildDeps();
    deps.videoClient.postFormData.mockResolvedValue({ id: 'vid_1' });

    const filePath = join(tempDir, 'clip.mp4');
    await writeFile(filePath, Buffer.from('video-bytes'));

    const service = createVideoService(deps);
    const result = await service.upload('123', {
      filePath,
      title: 'Launch',
      name: 'Launch video',
    });

    expect(result).toEqual({ video_id: 'vid_1' });
    expect(deps.videoClient.post).not.toHaveBeenCalled();

    const [endpoint, formData] = deps.videoClient.postFormData.mock.calls[0] as [string, FormData];
    expect(endpoint).toBe('act_123/advideos');
    expect(formData.get('title')).toBe('Launch');
    expect(formData.get('name')).toBe('Launch video');

    const source = formData.get('source');
    expect(source).toBeInstanceOf(Blob);
    expect((source as File).name).toBe('clip.mp4');
    await expect((source as Blob).text()).resolves.toBe('video-bytes');

    expect(deps.onProgress).toHaveBeenCalledWith(11, 11);
  });

  it('uploads large videos with start-transfer-finish flow', async () => {
    const deps = buildDeps();
    const filePath = join(tempDir, 'chunked.mp4');
    await createSparseFile(filePath, 'abcdefghij', CHUNKED_THRESHOLD + 1);

    deps.videoClient.post
      .mockResolvedValueOnce({
        upload_session_id: 'session_1',
        video_id: 'vid_2',
        start_offset: '0',
        end_offset: '5',
      })
      .mockResolvedValueOnce({
        status: 'processing',
      });
    deps.videoClient.postFormData
      .mockResolvedValueOnce({
        start_offset: '5',
        end_offset: '10',
      })
      .mockResolvedValueOnce({
        start_offset: '10',
        end_offset: '10',
      });

    const service = createVideoService(deps);
    const result = await service.upload('123', {
      filePath,
      name: 'chunked-video',
    });

    expect(result).toEqual({ video_id: 'vid_2', status: 'processing' });
    expect(deps.videoClient.post).toHaveBeenNthCalledWith(1, 'act_123/advideos', {
      upload_phase: 'start',
      file_size: CHUNKED_THRESHOLD + 1,
    });
    expect(deps.videoClient.post).toHaveBeenNthCalledWith(
      2,
      'act_123/advideos',
      expect.objectContaining({
        upload_phase: 'finish',
        upload_session_id: 'session_1',
        name: 'chunked-video',
      }),
    );

    const firstTransfer = deps.videoClient.postFormData.mock.calls[0]?.[1] as FormData;
    const secondTransfer = deps.videoClient.postFormData.mock.calls[1]?.[1] as FormData;

    expect(firstTransfer.get('upload_phase')).toBe('transfer');
    expect(firstTransfer.get('upload_session_id')).toBe('session_1');
    expect(firstTransfer.get('start_offset')).toBe('0');
    await expect((firstTransfer.get('video_file_chunk') as Blob).text()).resolves.toBe('abcde');

    expect(secondTransfer.get('start_offset')).toBe('5');
    await expect((secondTransfer.get('video_file_chunk') as Blob).text()).resolves.toBe('fghij');

    expect(deps.onProgress).toHaveBeenNthCalledWith(1, 5, CHUNKED_THRESHOLD + 1);
    expect(deps.onProgress).toHaveBeenNthCalledWith(2, 10, CHUNKED_THRESHOLD + 1);
  });

  it('rejects files larger than 4 GB', async () => {
    const deps = buildDeps();
    const filePath = join(tempDir, 'huge.mp4');
    await createSparseFile(filePath, 'huge', 4_000_000_001);

    const service = createVideoService(deps);

    await expect(service.upload('123', { filePath })).rejects.toMatchObject({
      name: 'CLIError',
      message: expect.stringMatching(/File exceeds 4 GB maximum/),
    });
  });

  it('rejects oversized server-provided chunk windows', async () => {
    const deps = buildDeps();
    const filePath = join(tempDir, 'oversized-window.mp4');
    await createSparseFile(filePath, 'abcdef', CHUNKED_THRESHOLD + 1);

    deps.videoClient.post.mockResolvedValueOnce({
      upload_session_id: 'session_large',
      video_id: 'vid_large',
      start_offset: '0',
      end_offset: String((5 * 1024 * 1024) + 1),
    });

    const service = createVideoService(deps);

    await expect(service.upload('123', { filePath })).rejects.toThrow(
      /Upload chunk window 5242881 bytes exceeds supported maximum 5242880 bytes/,
    );
    expect(deps.videoClient.postFormData).not.toHaveBeenCalled();
  });

  it('retries retryable chunk upload failures', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const deps = buildDeps();
    const filePath = join(tempDir, 'retry.mp4');
    await createSparseFile(filePath, 'abcde', CHUNKED_THRESHOLD + 1);

    deps.videoClient.post
      .mockResolvedValueOnce({
        upload_session_id: 'session_retry',
        video_id: 'vid_retry',
        start_offset: '0',
        end_offset: '5',
      })
      .mockResolvedValueOnce({
        status: 'processing',
      });
    deps.videoClient.postFormData
      .mockRejectedValueOnce(new RateLimitError('slow down', 613))
      .mockResolvedValueOnce({
        start_offset: '5',
        end_offset: '5',
      });

    const service = createVideoService(deps);
    await expect(service.upload('123', { filePath })).resolves.toEqual({
      video_id: 'vid_retry',
      status: 'processing',
    });

    expect(deps.videoClient.postFormData).toHaveBeenCalledTimes(2);
    expect(deps.logger.warn).toHaveBeenCalledWith(
      'Chunk at offset 0 failed (attempt 1/5), retrying in 1s...',
    );
  });
});
