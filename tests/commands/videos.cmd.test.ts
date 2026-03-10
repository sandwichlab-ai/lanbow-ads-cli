import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CommandDeps } from '../../src/commands/shared.js';

describe('videos command handler', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'meta-ads-videos-cmd-'));
    vi.resetModules();
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
    vi.resetModules();
  });

  function buildDeps(): CommandDeps {
    return {
      config: { default_account_id: '123' } as CommandDeps['config'],
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
      createScopedClient: vi.fn().mockReturnValue({
        getList: vi.fn(),
        getObject: vi.fn(),
        post: vi.fn(),
        postFormData: vi.fn(),
        delete: vi.fn(),
      }),
    };
  }

  async function writeTempFile(name: string, contents = 'video'): Promise<string> {
    const filePath = join(tempDir, name);
    await writeFile(filePath, contents);
    return filePath;
  }

  async function waitUntil(assertion: () => void, timeoutMs = 1_000): Promise<void> {
    const startedAt = Date.now();

    while (true) {
      try {
        assertion();
        return;
      } catch (error) {
        if (Date.now() - startedAt >= timeoutMs) {
          throw error;
        }
        await new Promise((resolve) => {
          setTimeout(resolve, 10);
        });
      }
    }
  }

  async function loadModule(options?: {
    uploadImpl?: (deps: { onProgress?: (uploadedBytes: number, totalBytes: number) => void }) => Promise<{
      video_id: string;
      status?: string;
    }>;
    resolveImpl?: () => Promise<{ imageHash?: string; videoStatus?: string }>;
    thumbnailResult?: { imageHash?: string; videoStatus?: string };
  }) {
    const uploadSpy = vi.fn().mockImplementation(async (_accountId: string, _input: unknown) => {
      throw new Error('uploadSpy not configured');
    });
    const resolveSpy = vi.fn().mockImplementation(() => {
      if (options?.resolveImpl) {
        return options.resolveImpl();
      }
      return Promise.resolve(options?.thumbnailResult ?? {});
    });
    const createVideoServiceSpy = vi.fn().mockImplementation((deps) => {
      uploadSpy.mockImplementation((accountId: string, input: unknown) => {
        if (options?.uploadImpl) {
          return options.uploadImpl(deps);
        }
        return Promise.resolve({ video_id: 'vid_default', status: 'processing' });
      });
      return { upload: uploadSpy };
    });
    const createThumbnailServiceSpy = vi.fn().mockReturnValue({ resolve: resolveSpy });

    vi.doMock('../../src/services/video.service.js', () => ({
      VIDEO_UPLOAD_TIMEOUT_MS: 60_000,
      createVideoService: createVideoServiceSpy,
    }));
    vi.doMock('../../src/services/thumbnail.service.js', () => ({
      createThumbnailService: createThumbnailServiceSpy,
    }));

    const mod = await import('../../src/commands/videos.cmd.js');
    return { mod, uploadSpy, resolveSpy, createVideoServiceSpy, createThumbnailServiceSpy };
  }

  it('rejects conflicting thumbnail flags before starting upload', async () => {
    const filePath = await writeTempFile('conflict.mp4');
    const deps = buildDeps();
    const { mod, createVideoServiceSpy, createThumbnailServiceSpy } = await loadModule();

    await expect(
      mod.handleVideoUpload(deps, {
        file: filePath,
        thumbnail: 'thumb.jpg',
        autoThumbnail: true,
      }),
    ).rejects.toThrow(/Cannot use both --thumbnail and --auto-thumbnail/);

    expect(deps.createScopedClient).not.toHaveBeenCalled();
    expect(createVideoServiceSpy).not.toHaveBeenCalled();
    expect(createThumbnailServiceSpy).not.toHaveBeenCalled();
  });

  it('outputs image_hash and ready status when auto-thumbnail succeeds', async () => {
    const filePath = await writeTempFile('success.mp4');
    const deps = buildDeps();
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const { mod, resolveSpy } = await loadModule({
      uploadImpl: async ({ onProgress }) => {
        onProgress?.(5, 10);
        return { video_id: 'vid_1', status: 'processing' };
      },
      thumbnailResult: { imageHash: 'img_hash_1', videoStatus: 'ready' },
    });

    await mod.handleVideoUpload(deps, {
      file: filePath,
      autoThumbnail: true,
    });

    expect(resolveSpy).toHaveBeenCalledWith('123', 'vid_1', {
      thumbnailPath: undefined,
      autoThumbnail: true,
    });
    expect(deps.formatter.output).toHaveBeenCalledWith(
      { video_id: 'vid_1', status: 'ready', image_hash: 'img_hash_1' },
      { title: 'Video Uploaded' },
    );
    expect(stderrWrite.mock.calls).toEqual([['\rUploading... 50%'], ['\n']]);
  });

  it('preserves ready status without image_hash when thumbnail resolution returns no hash', async () => {
    const filePath = await writeTempFile('ready-no-hash.mp4');
    const deps = buildDeps();
    const { mod } = await loadModule({
      uploadImpl: async () => ({ video_id: 'vid_2', status: 'processing' }),
      thumbnailResult: { videoStatus: 'ready' },
    });

    await mod.handleVideoUpload(deps, {
      file: filePath,
      autoThumbnail: true,
    });

    expect(deps.formatter.output).toHaveBeenCalledWith(
      { video_id: 'vid_2', status: 'ready' },
      { title: 'Video Uploaded' },
    );
  });

  it('prints a thumbnail hint when no thumbnail option is provided', async () => {
    const filePath = await writeTempFile('tip.mp4');
    const deps = buildDeps();
    const { mod } = await loadModule({
      uploadImpl: async () => ({ video_id: 'vid_4', status: 'processing' }),
    });

    await mod.handleVideoUpload(deps, {
      file: filePath,
    });

    expect(deps.logger.info).toHaveBeenCalledWith(
      'Tip: Most video ad placements require a thumbnail. Use --auto-thumbnail or --thumbnail <path> to get an image_hash.',
    );
  });

  it('does not print a thumbnail hint when a thumbnail option is provided', async () => {
    const filePath = await writeTempFile('no-tip.mp4');
    const deps = buildDeps();
    const { mod } = await loadModule({
      uploadImpl: async () => ({ video_id: 'vid_5', status: 'ready' }),
      thumbnailResult: { imageHash: 'img_hash_5', videoStatus: 'ready' },
    });

    await mod.handleVideoUpload(deps, {
      file: filePath,
      autoThumbnail: true,
    });

    expect(deps.logger.info).not.toHaveBeenCalledWith(
      'Tip: Most video ad placements require a thumbnail. Use --auto-thumbnail or --thumbnail <path> to get an image_hash.',
    );
  });

  it('writes a trailing newline when upload fails after reporting progress', async () => {
    const filePath = await writeTempFile('failure.mp4');
    const deps = buildDeps();
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const { mod } = await loadModule({
      uploadImpl: async ({ onProgress }) => {
        onProgress?.(3, 10);
        throw new Error('upload failed');
      },
    });

    await expect(mod.handleVideoUpload(deps, { file: filePath })).rejects.toThrow(/upload failed/);

    expect(stderrWrite.mock.calls).toEqual([['\rUploading... 30%'], ['\n']]);
    expect(deps.formatter.output).not.toHaveBeenCalled();
  });

  it('flushes the progress line before waiting for thumbnail resolution', async () => {
    const filePath = await writeTempFile('flush-before-thumbnail.mp4');
    const deps = buildDeps();
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockReturnValue(true);

    let releaseThumbnail: ((value: { imageHash?: string; videoStatus?: string }) => void) | undefined;
    const thumbnailPromise = new Promise<{ imageHash?: string; videoStatus?: string }>((resolve) => {
      releaseThumbnail = resolve;
    });

    const { mod } = await loadModule({
      uploadImpl: async ({ onProgress }) => {
        onProgress?.(10, 10);
        return { video_id: 'vid_3', status: 'processing' };
      },
      resolveImpl: () => thumbnailPromise,
    });

    const commandPromise = mod.handleVideoUpload(deps, {
      file: filePath,
      autoThumbnail: true,
    });

    await waitUntil(() => {
      expect(stderrWrite.mock.calls).toEqual([['\rUploading... 100%'], ['\n']]);
    });

    releaseThumbnail?.({ videoStatus: 'ready' });
    await commandPromise;
  });
});
