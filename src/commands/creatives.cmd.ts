import type { Command } from 'commander';

import { createCreativeService } from '../services/creative.service.js';
import { fetchAllPages, printPaginationHint } from '../utils/pagination.js';
import type { CommandDeps } from './shared.js';
import { parseJsonOption, requireAccountId, runCommand } from './shared.js';

interface CreativesListOptions {
  ad?: string;
  fields?: string[];
  limit: string;
  after?: string;
  all?: boolean;
}

interface CreativesCreateOptions {
  name: string;
  pageId?: string;
  imageHash?: string;
  videoId?: string;
  link?: string;
  message?: string;
  headline?: string;
  description?: string;
  callToAction?: string;
  instagramActorId?: string;
  objectStorySpec?: string;
  assetFeedSpec?: string;
}

interface CreativesUpdateOptions {
  name: string;
}

async function handleCreativesList(deps: CommandDeps, options: CreativesListOptions): Promise<void> {
  const service = createCreativeService(deps);
  const parentId = options.ad ?? requireAccountId(deps.config);
  const listOptions = {
    fields: options.fields,
    limit: parseInt(options.limit, 10),
    after: options.after,
  };

  if (options.all) {
    const allData = await fetchAllPages((cursor) => service.list(parentId, { ...listOptions, after: cursor }));
    deps.formatter.output(allData, {
      columns: ['id', 'name', 'status', 'thumbnail_url'],
      title: 'Creatives',
    });
    return;
  }

  const result = await service.list(parentId, listOptions);
  deps.formatter.output(result.data, {
    columns: ['id', 'name', 'status', 'thumbnail_url'],
    title: 'Creatives',
  });
  printPaginationHint(result.paging);
}

async function handleCreativesGet(deps: CommandDeps, creativeId: string): Promise<void> {
  const service = createCreativeService(deps);
  const result = await service.get(creativeId);
  deps.formatter.output(result, { title: `Creative: ${result.name ?? result.id}` });
}

async function handleCreativesCreate(deps: CommandDeps, options: CreativesCreateOptions): Promise<void> {
  const service = createCreativeService(deps);
  const accountId = requireAccountId(deps.config);
  const input = {
    name: options.name,
    page_id: options.pageId,
    image_hash: options.imageHash,
    video_id: options.videoId,
    link: options.link,
    message: options.message,
    headline: options.headline,
    description: options.description,
    call_to_action: options.callToAction,
    instagram_actor_id: options.instagramActorId,
    object_story_spec: parseJsonOption<Record<string, unknown>>(options.objectStorySpec, 'object-story-spec'),
    asset_feed_spec: parseJsonOption<Record<string, unknown>>(options.assetFeedSpec, 'asset-feed-spec'),
  };

  const result = await service.create(accountId, input);
  deps.formatter.output(result, { title: 'Creative Created' });
}

async function handleCreativesUpdate(
  deps: CommandDeps,
  creativeId: string,
  options: CreativesUpdateOptions,
): Promise<void> {
  const service = createCreativeService(deps);
  const result = await service.update(creativeId, { name: options.name });
  deps.formatter.output(result, { title: 'Creative Updated' });
}

export function registerCreativesCommand(program: Command): void {
  const creatives = program.command('creatives').description('Ad creative management');

  creatives
    .command('list')
    .description('List ad creatives')
    .option('--ad <id>', 'List creatives for a specific ad')
    .option('--fields <fields...>', 'Custom fields to retrieve')
    .option('--limit <n>', 'Max results', '25')
    .option('--after <cursor>', 'Pagination cursor')
    .option('--all', 'Fetch all pages')
    .action(runCommand(handleCreativesList));

  creatives.command('get <creative-id>').description('Get creative details').action(runCommand(handleCreativesGet));

  creatives
    .command('create')
    .description('Create an ad creative')
    .requiredOption('--name <name>', 'Creative name')
    .option('--page-id <id>', 'Facebook Page ID')
    .option('--image-hash <hash>', 'Image hash from images upload')
    .option('--video-id <id>', 'Video ID from videos upload (builds video_data)')
    .option('--link <url>', 'Destination URL')
    .option('--message <text>', 'Post body text')
    .option('--headline <text>', 'Ad headline')
    .option('--description <text>', 'Ad description')
    .option('--call-to-action <type>', 'CTA type (e.g., LEARN_MORE, SHOP_NOW)')
    .option('--instagram-actor-id <id>', 'Instagram account ID')
    .option('--object-story-spec <json>', 'Full object_story_spec as JSON')
    .option('--asset-feed-spec <json>', 'Full asset_feed_spec as JSON (dynamic creative)')
    .action(runCommand(handleCreativesCreate));

  creatives
    .command('update <creative-id>')
    .description('Update a creative (name only)')
    .requiredOption('--name <name>', 'New creative name')
    .action(runCommand(handleCreativesUpdate));
}
