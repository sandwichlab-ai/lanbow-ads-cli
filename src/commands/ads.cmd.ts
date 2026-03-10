import type { Command } from 'commander';

import { CLIError } from '../client/errors.js';
import type { AdStatus } from '../schemas/enums.js';
import { createAdService } from '../services/ad.service.js';
import { fetchAllPages, printPaginationHint } from '../utils/pagination.js';
import type { CommandDeps } from './shared.js';
import { parseJsonOption, requireAccountId, runCommand } from './shared.js';

interface AdsListOptions {
  adset?: string;
  campaign?: string;
  status?: string[];
  fields?: string[];
  limit: string;
  after?: string;
  all?: boolean;
}

interface AdsCreateOptions {
  name: string;
  adsetId: string;
  status?: AdStatus;
  creativeId?: string;
  bidAmount?: string;
  trackingSpecs?: string;
  conversionDomain?: string;
}

interface AdsUpdateOptions {
  name?: string;
  status?: AdStatus;
  creativeId?: string;
  bidAmount?: string;
}

async function handleAdsList(deps: CommandDeps, options: AdsListOptions): Promise<void> {
  const service = createAdService(deps);
  const parentId = options.adset ?? options.campaign ?? requireAccountId(deps.config);

  const listOptions = {
    effectiveStatus: options.status,
    fields: options.fields,
    limit: parseInt(options.limit, 10),
    after: options.after,
  };

  if (options.all) {
    const allData = await fetchAllPages((cursor) => service.list(parentId, { ...listOptions, after: cursor }));
    deps.formatter.output(allData, {
      columns: ['id', 'name', 'adset_id', 'campaign_id', 'status'],
      title: 'Ads',
    });
    return;
  }

  const result = await service.list(parentId, listOptions);
  deps.formatter.output(result.data, {
    columns: ['id', 'name', 'adset_id', 'campaign_id', 'status'],
    title: 'Ads',
  });
  printPaginationHint(result.paging);
}

async function handleAdsGet(deps: CommandDeps, adId: string): Promise<void> {
  const service = createAdService(deps);
  const result = await service.get(adId);
  deps.formatter.output(result, { title: `Ad: ${result.name}` });
}

async function handleAdsCreate(deps: CommandDeps, options: AdsCreateOptions): Promise<void> {
  const service = createAdService(deps);
  const accountId = requireAccountId(deps.config);

  const input = {
    name: options.name,
    adset_id: options.adsetId,
    status: options.status ?? 'PAUSED',
    creative_id: options.creativeId,
    bid_amount: options.bidAmount ? parseInt(options.bidAmount, 10) : undefined,
    tracking_specs: parseJsonOption<Array<{ 'action.type': string[]; fb_pixel?: string[] }>>(
      options.trackingSpecs,
      'tracking-specs',
    ),
    conversion_domain: options.conversionDomain,
  };

  const result = await service.create(accountId, input);
  deps.formatter.output(result, { title: 'Ad Created' });
}

async function handleAdsUpdate(deps: CommandDeps, adId: string, options: AdsUpdateOptions): Promise<void> {
  const service = createAdService(deps);
  const input = {
    name: options.name,
    status: options.status,
    creative_id: options.creativeId,
    bid_amount: options.bidAmount ? parseInt(options.bidAmount, 10) : undefined,
  };

  if (Object.values(input).every((value) => value === undefined)) {
    throw new CLIError('No update fields provided. Pass at least one update option.');
  }

  const result = await service.update(adId, input);
  deps.formatter.output(result, { title: 'Ad Updated' });
}

export function registerAdsCommand(program: Command): void {
  const ads = program.command('ads').description('Ad management');

  ads
    .command('list')
    .description('List ads')
    .option('--adset <id>', 'Filter by ad set ID')
    .option('--campaign <id>', 'Filter by campaign ID')
    .option('--status <status...>', 'Filter by status')
    .option('--fields <fields...>', 'Custom fields to retrieve')
    .option('--limit <n>', 'Max results', '25')
    .option('--after <cursor>', 'Pagination cursor')
    .option('--all', 'Fetch all pages')
    .action(runCommand(handleAdsList));

  ads.command('get <ad-id>').description('Get ad details').action(runCommand(handleAdsGet));

  ads
    .command('create')
    .description('Create a new ad')
    .requiredOption('--name <name>', 'Ad name')
    .requiredOption('--adset-id <id>', 'Parent ad set ID')
    .option('--status <status>', 'Initial status', 'PAUSED')
    .option('--creative-id <id>', 'Creative ID')
    .option('--bid-amount <cents>', 'Bid amount in cents')
    .option('--tracking-specs <json>', 'Tracking specs as JSON')
    .option('--conversion-domain <domain>', 'Conversion domain')
    .action(runCommand(handleAdsCreate));

  ads
    .command('update <ad-id>')
    .description('Update an ad')
    .option('--name <name>', 'Ad name')
    .option('--status <status>', 'Ad status')
    .option('--creative-id <id>', 'Creative ID')
    .option('--bid-amount <cents>', 'Bid amount in cents')
    .action(runCommand(handleAdsUpdate));
}
