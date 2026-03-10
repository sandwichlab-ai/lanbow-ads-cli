import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { Command } from 'commander';

import { CLIError } from '../client/errors.js';
import { createImageService } from '../services/image.service.js';
import type { CommandDeps } from './shared.js';
import { requireAccountId, runCommand } from './shared.js';

interface ImageUploadOptions {
  file: string;
  name?: string;
}

async function handleImageUpload(deps: CommandDeps, options: ImageUploadOptions): Promise<void> {
  let fileBuffer: Buffer;
  try {
    fileBuffer = await readFile(options.file);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CLIError(`Failed to read image file "${options.file}": ${message}`);
  }

  const service = createImageService(deps);
  const accountId = requireAccountId(deps.config);
  const result = await service.upload(accountId, {
    bytes: fileBuffer.toString('base64'),
    name: options.name ?? basename(options.file),
  });

  deps.formatter.output(result, { title: 'Image Uploaded' });
}

export function registerImagesCommand(program: Command): void {
  const images = program.command('images').description('Ad image management');

  images
    .command('upload')
    .description('Upload an image to an ad account')
    .requiredOption('--file <path>', 'Path to image file')
    .option('--name <name>', 'Image name (defaults to filename)')
    .action(runCommand(handleImageUpload));
}
