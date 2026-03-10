import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

import { CLIError } from '../client/errors.js';
import type { GraphAPIClient } from '../client/graph-api.js';
import type { Logger } from '../utils/logger.js';
import { sleep } from '../utils/timing.js';
import { createImageService } from './image.service.js';

const THUMBNAIL_DOWNLOAD_TIMEOUT_MS = 30_000;
const VIDEO_READY_POLL_INTERVAL_MS = 5_000;
const VIDEO_READY_TIMEOUT_MS = 120_000;

interface ThumbnailDeps {
  client: GraphAPIClient;
  logger: Logger;
}

interface ThumbnailResolveOptions {
  thumbnailPath?: string;
  autoThumbnail?: boolean;
}

export interface ThumbnailResult {
  imageHash?: string;
  videoStatus?: string;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return 'Request timed out';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

async function uploadThumbnailFromFile(
  deps: ThumbnailDeps,
  accountId: string,
  thumbnailPath: string,
): Promise<string> {
  let fileBuffer: Buffer;
  try {
    fileBuffer = await readFile(thumbnailPath);
  } catch (error) {
    throw new CLIError(`Failed to read thumbnail file "${thumbnailPath}": ${toErrorMessage(error)}`);
  }

  const imageService = createImageService(deps);
  const result = await imageService.upload(accountId, {
    bytes: fileBuffer.toString('base64'),
    name: basename(thumbnailPath),
  });
  return result.hash;
}

async function waitForVideoReady(client: GraphAPIClient, videoId: string): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < VIDEO_READY_TIMEOUT_MS) {
    const video = await client.getObject<{
      status?: {
        video_status?: string;
      };
    }>(videoId, { fields: 'status' });

    const status = video.status?.video_status;
    if (status === 'ready') {
      return;
    }
    if (status === 'error') {
      throw new CLIError(`Video processing failed (${videoId})`);
    }

    await sleep(VIDEO_READY_POLL_INTERVAL_MS);
  }

  throw new CLIError(`Video processing timed out after ${VIDEO_READY_TIMEOUT_MS / 1000}s`);
}

async function downloadThumbnailBuffer(url: string): Promise<Buffer> {
  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(THUMBNAIL_DOWNLOAD_TIMEOUT_MS),
    });
  } catch (error) {
    throw new CLIError(`Failed to download thumbnail: ${toErrorMessage(error)}`);
  }

  if (!response.ok) {
    throw new CLIError(`Failed to download thumbnail: HTTP ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function extractMetaThumbnail(
  deps: ThumbnailDeps,
  accountId: string,
  videoId: string,
): Promise<string> {
  const video = await deps.client.getObject<{
    thumbnails?: {
      data: Array<{ uri: string }>;
    };
  }>(videoId, { fields: 'thumbnails' });

  const thumbnailUrl = video.thumbnails?.data[0]?.uri;
  if (!thumbnailUrl) {
    throw new CLIError(`No thumbnails available for video ${videoId}`);
  }

  const buffer = await downloadThumbnailBuffer(thumbnailUrl);
  const imageService = createImageService(deps);
  const result = await imageService.upload(accountId, {
    bytes: buffer.toString('base64'),
    name: `thumbnail_${videoId}`,
  });

  return result.hash;
}

export function createThumbnailService(deps: ThumbnailDeps) {
  return {
    async resolve(
      accountId: string,
      videoId: string,
      options: ThumbnailResolveOptions,
    ): Promise<ThumbnailResult> {
      if (!options.thumbnailPath && !options.autoThumbnail) {
        return {};
      }

      const result: ThumbnailResult = {};

      try {
        if (options.thumbnailPath) {
          result.imageHash = await uploadThumbnailFromFile(deps, accountId, options.thumbnailPath);
          return result;
        }

        await waitForVideoReady(deps.client, videoId);
        result.videoStatus = 'ready';
        result.imageHash = await extractMetaThumbnail(deps, accountId, videoId);
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        deps.logger.warn(`Thumbnail extraction failed (video_id ${videoId} is still valid): ${message}`);
        return result;
      }
    },
  };
}
