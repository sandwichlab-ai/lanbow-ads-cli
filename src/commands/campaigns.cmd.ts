import type { Command } from 'commander';

import { CLIError } from '../client/errors.js';
import type { BidStrategy, CampaignObjective, CampaignStatus } from '../schemas/enums.js';
import { createCampaignService } from '../services/campaign.service.js';
import { fetchAllPages, printPaginationHint } from '../utils/pagination.js';
import type { CommandDeps } from './shared.js';
import { requireAccountId, runCommand } from './shared.js';

interface CampaignListOptions {
  status?: string[];
  objective?: CampaignObjective;
  fields?: string[];
  limit: string;
  after?: string;
  all?: boolean;
}

interface CampaignCreateOptions {
  name: string;
  objective: CampaignObjective;
  status?: CampaignStatus;
  dailyBudget?: string;
  lifetimeBudget?: string;
  bidStrategy?: BidStrategy;
  bidCap?: string;
  specialAdCategories?: string[];
  useAdsetLevelBudgets?: boolean;
}

interface CampaignUpdateOptions {
  name?: string;
  status?: CampaignStatus;
  dailyBudget?: string;
  lifetimeBudget?: string;
  bidStrategy?: BidStrategy;
  bidCap?: string;
}

async function handleCampaignsList(deps: CommandDeps, options: CampaignListOptions): Promise<void> {
  const service = createCampaignService(deps);
  const accountId = requireAccountId(deps.config);

  const listOptions = {
    effectiveStatus: options.status,
    objective: options.objective,
    fields: options.fields,
    limit: parseInt(options.limit, 10),
    after: options.after,
  };

  if (options.all) {
    const allData = await fetchAllPages((cursor) => service.list(accountId, { ...listOptions, after: cursor }));
    deps.formatter.output(allData, {
      columns: ['id', 'name', 'objective', 'status', 'daily_budget', 'lifetime_budget'],
      title: 'Campaigns',
    });
    return;
  }

  const result = await service.list(accountId, listOptions);
  deps.formatter.output(result.data, {
    columns: ['id', 'name', 'objective', 'status', 'daily_budget', 'lifetime_budget'],
    title: 'Campaigns',
  });
  printPaginationHint(result.paging);
}

async function handleCampaignsGet(deps: CommandDeps, campaignId: string): Promise<void> {
  const service = createCampaignService(deps);
  const result = await service.get(campaignId);
  deps.formatter.output(result, { title: `Campaign: ${result.name}` });
}

async function handleCampaignsCreate(deps: CommandDeps, options: CampaignCreateOptions): Promise<void> {
  const service = createCampaignService(deps);
  const accountId = requireAccountId(deps.config);

  const input = {
    name: options.name,
    objective: options.objective,
    status: options.status ?? 'PAUSED',
    daily_budget: options.dailyBudget ? parseInt(options.dailyBudget, 10) : undefined,
    lifetime_budget: options.lifetimeBudget ? parseInt(options.lifetimeBudget, 10) : undefined,
    bid_strategy: options.bidStrategy,
    bid_cap: options.bidCap ? parseInt(options.bidCap, 10) : undefined,
    special_ad_categories: options.specialAdCategories ?? [],
    use_adset_level_budgets: options.useAdsetLevelBudgets,
  };

  const result = await service.create(accountId, input);
  deps.formatter.output(result, { title: 'Campaign Created' });
}

async function handleCampaignsUpdate(
  deps: CommandDeps,
  campaignId: string,
  options: CampaignUpdateOptions,
): Promise<void> {
  const service = createCampaignService(deps);

  const input = {
    name: options.name,
    status: options.status,
    daily_budget: options.dailyBudget ? parseInt(options.dailyBudget, 10) : undefined,
    lifetime_budget: options.lifetimeBudget ? parseInt(options.lifetimeBudget, 10) : undefined,
    bid_strategy: options.bidStrategy,
    bid_cap: options.bidCap ? parseInt(options.bidCap, 10) : undefined,
  };

  if (Object.values(input).every((value) => value === undefined)) {
    throw new CLIError('No update fields provided. Pass at least one update option.');
  }

  const result = await service.update(campaignId, input);
  deps.formatter.output(result, { title: 'Campaign Updated' });
}

export function registerCampaignsCommand(program: Command): void {
  const campaigns = program.command('campaigns').description('Campaign management');

  campaigns
    .command('list')
    .description('List campaigns')
    .option('--status <status...>', 'Filter by status (ACTIVE, PAUSED, ARCHIVED)')
    .option('--objective <objective>', 'Filter by objective')
    .option('--fields <fields...>', 'Custom fields to retrieve')
    .option('--limit <n>', 'Max results', '25')
    .option('--after <cursor>', 'Pagination cursor')
    .option('--all', 'Fetch all pages')
    .action(runCommand(handleCampaignsList));

  campaigns.command('get <campaign-id>').description('Get campaign details').action(runCommand(handleCampaignsGet));

  campaigns
    .command('create')
    .description('Create a new campaign')
    .requiredOption('--name <name>', 'Campaign name')
    .requiredOption('--objective <objective>', 'Campaign objective')
    .option('--status <status>', 'Initial status', 'PAUSED')
    .option('--daily-budget <cents>', 'Daily budget in cents')
    .option('--lifetime-budget <cents>', 'Lifetime budget in cents')
    .option('--bid-strategy <strategy>', 'Bid strategy')
    .option('--bid-cap <cents>', 'Bid cap in cents')
    .option('--special-ad-categories <categories...>', 'Special ad categories')
    .option('--use-adset-level-budgets', 'Use ad set level budgets (ABO mode, no campaign budget)')
    .action(runCommand(handleCampaignsCreate));

  campaigns
    .command('update <campaign-id>')
    .description('Update a campaign')
    .option('--name <name>', 'Campaign name')
    .option('--status <status>', 'Campaign status')
    .option('--daily-budget <cents>', 'Daily budget in cents')
    .option('--lifetime-budget <cents>', 'Lifetime budget in cents')
    .option('--bid-strategy <strategy>', 'Bid strategy')
    .option('--bid-cap <cents>', 'Bid cap in cents')
    .action(runCommand(handleCampaignsUpdate));
}
