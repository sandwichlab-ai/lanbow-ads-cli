import * as fs from 'node:fs/promises';
import { basename } from 'node:path';

import { CLIError, GraphAPIError, NetworkError, RateLimitError } from '../client/errors.js';
import type { GraphAPIClient } from '../client/graph-api.js';
import { VideoUploadSchema, type VideoUploadInput } from '../schemas/videos.js';
import { normalizeAccountId } from '../utils/account.js';
import { enrichError } from '../utils/errors.js';
import type { Logger } from '../utils/logger.js';
import { sleep } from '../utils/timing.js';

const CHUNKED_THRESHOLD = 20 * 1024 * 1024;
const MAX_CHUNK_WINDOW_SIZE = 5 * 1024 * 1024;
const MAX_FILE_SIZE = 4_000_000_000;
export const VIDEO_UPLOAD_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 5;
const RETRY_BASE_DELAY_MS = 1_000;
const RETRY_MAX_DELAY_MS = 60_000;

const RETRYABLE_API_CODES = new Set([1, 2, 4, 17, 32, 80, 613]);

interface StartUploadResponse {
  upload_session_id: string;
  video_id: string;
  start_offset: string;
  end_offset: string;
}

interface TransferUploadResponse {
  start_offset: string;
  end_offset: string;
}

interface FinishUploadResponse {
  video_id?: string;
  status?: string;
  success?: boolean;
}

interface SingleUploadResponse {
  id: string;
}

export interface VideoUploadResult {
  video_id: string;
  status?: string;
}

interface VideoServiceDeps {
  videoClient: GraphAPIClient;
  logger: Logger;
  onProgress?: (uploadedBytes: number, totalBytes: number) => void;
}

export interface VideoService {
  upload(accountId: string, input: VideoUploadInput): Promise<VideoUploadResult>;
}

function toBlobPart(buffer: Buffer): BlobPart {
  const bytes = new Uint8Array(buffer.byteLength);
  bytes.set(buffer);
  return bytes.buffer;
}

function isRetryable(error: unknown): boolean {
  if (error instanceof RateLimitError) {
    return true;
  }
  if (error instanceof GraphAPIError) {
    return RETRYABLE_API_CODES.has(error.code);
  }
  return error instanceof NetworkError;
}

function retryDelay(attempt: number): number {
  const base = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
  const capped = Math.min(base, RETRY_MAX_DELAY_MS);
  const jitter = capped * (0.8 + Math.random() * 0.4);
  return jitter;
}

function parseOffset(value: string, label: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new CLIError(`Invalid ${label} returned by video upload API: ${value}`);
  }
  return parsed;
}

async function singleUpload(
  deps: VideoServiceDeps,
  accountId: string,
  filePath: string,
  input: VideoUploadInput,
): Promise<VideoUploadResult> {
  const fileBuffer = await fs.readFile(filePath);
  const formData = new FormData();
  formData.set('source', new Blob([toBlobPart(fileBuffer)]), basename(filePath));
  if (input.title) {
    formData.set('title', input.title);
  }
  if (input.name) {
    formData.set('name', input.name);
  }

  const result = await deps.videoClient.postFormData<SingleUploadResponse>(`${accountId}/advideos`, formData);
  deps.onProgress?.(fileBuffer.byteLength, fileBuffer.byteLength);

  return { video_id: result.id };
}

async function transferChunkWithRetry(
  deps: VideoServiceDeps,
  endpoint: string,
  input: {
    uploadSessionId: string;
    startOffset: number;
    buffer: Buffer;
  },
  attempt = 1,
): Promise<TransferUploadResponse> {
  const formData = new FormData();
  formData.set('upload_phase', 'transfer');
  formData.set('upload_session_id', input.uploadSessionId);
  formData.set('start_offset', String(input.startOffset));
  formData.set('video_file_chunk', new Blob([toBlobPart(input.buffer)]), 'chunk');

  try {
    return await deps.videoClient.postFormData<TransferUploadResponse>(endpoint, formData);
  } catch (error) {
    if (attempt >= MAX_RETRIES || !isRetryable(error)) {
      throw enrichError(error, `Failed to upload chunk at offset ${input.startOffset}`);
    }

    const delay = retryDelay(attempt);
    deps.logger.warn(
      `Chunk at offset ${input.startOffset} failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${Math.round(delay / 1000)}s...`,
    );
    await sleep(delay);
    return transferChunkWithRetry(deps, endpoint, input, attempt + 1);
  }
}

async function chunkedUpload(
  deps: VideoServiceDeps,
  accountId: string,
  filePath: string,
  fileSize: number,
  input: VideoUploadInput,
): Promise<VideoUploadResult> {
  const endpoint = `${accountId}/advideos`;
  const startResult = await deps.videoClient.post<StartUploadResponse>(endpoint, {
    upload_phase: 'start',
    file_size: fileSize,
  });

  const uploadSessionId = startResult.upload_session_id;
  const videoId = startResult.video_id;
  let startOffset = parseOffset(startResult.start_offset, 'start_offset');
  let endOffset = parseOffset(startResult.end_offset, 'end_offset');

  const fileHandle = await fs.open(filePath, 'r');
  try {
    while (startOffset !== endOffset) {
      if (endOffset < startOffset) {
        throw new CLIError(`Invalid upload window returned by video upload API: ${startOffset}-${endOffset}`);
      }

      const chunkSize = endOffset - startOffset;
      if (chunkSize > MAX_CHUNK_WINDOW_SIZE) {
        throw new CLIError(
          `Upload chunk window ${chunkSize} bytes exceeds supported maximum ${MAX_CHUNK_WINDOW_SIZE} bytes`,
        );
      }
      const buffer = Buffer.alloc(chunkSize);
      const { bytesRead } = await fileHandle.read(buffer, 0, chunkSize, startOffset);
      if (bytesRead !== chunkSize) {
        throw new CLIError(
          `Failed to read ${chunkSize} bytes for upload chunk at offset ${startOffset}; read ${bytesRead} bytes`,
        );
      }

      const transferResult = await transferChunkWithRetry(deps, endpoint, {
        uploadSessionId,
        startOffset,
        buffer,
      });

      startOffset = parseOffset(transferResult.start_offset, 'start_offset');
      endOffset = parseOffset(transferResult.end_offset, 'end_offset');
      deps.onProgress?.(startOffset, fileSize);
    }
  } finally {
    await fileHandle.close();
  }

  const finishResult = await deps.videoClient.post<FinishUploadResponse>(endpoint, {
    upload_phase: 'finish',
    upload_session_id: uploadSessionId,
    title: input.title,
    name: input.name,
  });

  return {
    video_id: finishResult.video_id ?? videoId,
    status: finishResult.status,
  };
}

export function createVideoService(deps: VideoServiceDeps): VideoService {
  return {
    async upload(accountId: string, input: VideoUploadInput): Promise<VideoUploadResult> {
      const id = normalizeAccountId(accountId);
      const validated = VideoUploadSchema.parse(input);

      let stats: Awaited<ReturnType<typeof fs.stat>>;
      try {
        stats = await fs.stat(validated.filePath);
      } catch (error) {
        throw enrichError(error, `Failed to inspect video file "${validated.filePath}"`);
      }

      if (stats.size > MAX_FILE_SIZE) {
        throw new CLIError(`File exceeds 4 GB maximum (${stats.size} bytes).`);
      }

      try {
        if (stats.size <= CHUNKED_THRESHOLD) {
          return await singleUpload(deps, id, validated.filePath, validated);
        }

        return await chunkedUpload(deps, id, validated.filePath, stats.size, validated);
      } catch (error) {
        throw enrichError(error, `Failed to upload video to ${id}`);
      }
    },
  };
}
