import { access } from 'node:fs/promises';
import { basename } from 'node:path';
import type { Command } from 'commander';

import { CLIError } from '../client/errors.js';
import { GRAPH_VIDEO_BASE_URL } from '../client/graph-api.js';
import { createThumbnailService } from '../services/thumbnail.service.js';
import { createVideoService, VIDEO_UPLOAD_TIMEOUT_MS } from '../services/video.service.js';
import type { CommandDeps } from './shared.js';
import { requireAccountId, runCommand } from './shared.js';

interface VideoUploadOptions {
  file: string;
  title?: string;
  name?: string;
  thumbnail?: string;
  autoThumbnail?: boolean;
}

export async function handleVideoUpload(deps: CommandDeps, options: VideoUploadOptions): Promise<void> {
  try {
    await access(options.file);
  } catch {
    throw new CLIError(`File not found: "${options.file}"`);
  }

  if (options.thumbnail && options.autoThumbnail) {
    throw new CLIError('Cannot use both --thumbnail and --auto-thumbnail.');
  }

  const accountId = requireAccountId(deps.config);
  const videoClient = deps.createScopedClient({
    baseUrl: GRAPH_VIDEO_BASE_URL,
    timeout: VIDEO_UPLOAD_TIMEOUT_MS,
  });

  let wroteProgress = false;
  const flushProgressLine = () => {
    if (wroteProgress) {
      process.stderr.write('\n');
      wroteProgress = false;
    }
  };

  const service = createVideoService({
    videoClient,
    logger: deps.logger,
    onProgress(uploaded, total) {
      wroteProgress = true;
      const pct = total === 0 ? 100 : Math.min(100, Math.round((uploaded / total) * 100));
      process.stderr.write(`\rUploading... ${pct}%`);
    },
  });

  try {
    const result = await service.upload(accountId, {
      filePath: options.file,
      title: options.title,
      name: options.name ?? basename(options.file),
    });
    flushProgressLine();

    const thumbnail = await createThumbnailService({
      client: deps.client,
      logger: deps.logger,
    }).resolve(accountId, result.video_id, {
      thumbnailPath: options.thumbnail,
      autoThumbnail: options.autoThumbnail,
    });

    const output: Record<string, unknown> = {
      video_id: result.video_id,
    };
    const status = thumbnail.videoStatus ?? result.status;
    if (status) {
      output.status = status;
    }
    if (thumbnail.imageHash) {
      output.image_hash = thumbnail.imageHash;
    }

    deps.formatter.output(output, { title: 'Video Uploaded' });
    if (!options.thumbnail && !options.autoThumbnail) {
      deps.logger.info(
        'Tip: Most video ad placements require a thumbnail. Use --auto-thumbnail or --thumbnail <path> to get an image_hash.',
      );
    }
  } finally {
    flushProgressLine();
  }
}

export function registerVideosCommand(program: Command): void {
  const videos = program.command('videos').description('Ad video management');

  videos
    .command('upload')
    .description('Upload a video to an ad account')
    .requiredOption('--file <path>', 'Path to video file')
    .option('--title <text>', 'Video title')
    .option('--name <name>', 'Video name (defaults to filename)')
    .option('--thumbnail <path>', 'Local image to use as thumbnail')
    .option('--auto-thumbnail', 'Auto-extract thumbnail from Meta (waits for processing)')
    .action(runCommand(handleVideoUpload));
}
