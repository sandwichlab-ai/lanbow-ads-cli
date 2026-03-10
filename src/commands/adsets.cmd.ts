import type { Command } from 'commander';

import { CLIError } from '../client/errors.js';
import type {
  AdSetStatus,
  BidStrategy,
  BillingEvent,
  DestinationType,
  OptimizationGoal,
} from '../schemas/enums.js';
import { createAdSetService } from '../services/adset.service.js';
import { fetchAllPages, printPaginationHint } from '../utils/pagination.js';
import type { CommandDeps } from './shared.js';
import { parseJsonOption, requireAccountId, runCommand } from './shared.js';

interface AdSetListOptions {
  campaign?: string;
  status?: string[];
  fields?: string[];
  limit: string;
  after?: string;
  all?: boolean;
}

interface AdSetCreateOptions {
  campaignId: string;
  name: string;
  optimizationGoal: OptimizationGoal;
  billingEvent: BillingEvent;
  status?: AdSetStatus;
  dailyBudget?: string;
  lifetimeBudget?: string;
  bidAmount?: string;
  bidStrategy?: BidStrategy;
  targeting?: string;
  startTime?: string;
  endTime?: string;
  destinationType?: DestinationType;
  promotedObject?: string;
}

interface AdSetUpdateOptions {
  name?: string;
  status?: AdSetStatus;
  dailyBudget?: string;
  lifetimeBudget?: string;
  bidAmount?: string;
  bidStrategy?: BidStrategy;
  targeting?: string;
  startTime?: string;
  endTime?: string;
  frequencyCap?: string;
  frequencyControlSpecs?: string;
}

async function handleAdSetsList(deps: CommandDeps, options: AdSetListOptions): Promise<void> {
  const service = createAdSetService(deps);

  const parentId = options.campaign ?? requireAccountId(deps.config);
  const listOptions = {
    effectiveStatus: options.status,
    fields: options.fields,
    limit: parseInt(options.limit, 10),
    after: options.after,
  };

  if (options.all) {
    const allData = await fetchAllPages((cursor) => service.list(parentId, { ...listOptions, after: cursor }));
    deps.formatter.output(allData, {
      columns: ['id', 'name', 'campaign_id', 'status', 'optimization_goal', 'billing_event'],
      title: 'Ad Sets',
    });
    return;
  }

  const result = await service.list(parentId, listOptions);
  deps.formatter.output(result.data, {
    columns: ['id', 'name', 'campaign_id', 'status', 'optimization_goal', 'billing_event'],
    title: 'Ad Sets',
  });
  printPaginationHint(result.paging);
}

async function handleAdSetsGet(deps: CommandDeps, adsetId: string): Promise<void> {
  const service = createAdSetService(deps);
  const result = await service.get(adsetId);
  deps.formatter.output(result, { title: `Ad Set: ${result.name}` });
}

async function handleAdSetsCreate(deps: CommandDeps, options: AdSetCreateOptions): Promise<void> {
  const service = createAdSetService(deps);
  const accountId = requireAccountId(deps.config);

  const input = {
    campaign_id: options.campaignId,
    name: options.name,
    optimization_goal: options.optimizationGoal,
    billing_event: options.billingEvent,
    status: options.status ?? 'PAUSED',
    daily_budget: options.dailyBudget ? parseInt(options.dailyBudget, 10) : undefined,
    lifetime_budget: options.lifetimeBudget ? parseInt(options.lifetimeBudget, 10) : undefined,
    bid_amount: options.bidAmount ? parseInt(options.bidAmount, 10) : undefined,
    bid_strategy: options.bidStrategy,
    targeting: parseJsonOption<Record<string, unknown>>(options.targeting, 'targeting'),
    start_time: options.startTime,
    end_time: options.endTime,
    destination_type: options.destinationType,
    promoted_object: parseJsonOption<Record<string, string>>(options.promotedObject, 'promoted-object'),
  };

  const result = await service.create(accountId, input);
  deps.formatter.output(result, { title: 'Ad Set Created' });
}

async function handleAdSetsUpdate(deps: CommandDeps, adsetId: string, options: AdSetUpdateOptions): Promise<void> {
  const service = createAdSetService(deps);

  const input = {
    name: options.name,
    status: options.status,
    daily_budget: options.dailyBudget ? parseInt(options.dailyBudget, 10) : undefined,
    lifetime_budget: options.lifetimeBudget ? parseInt(options.lifetimeBudget, 10) : undefined,
    bid_amount: options.bidAmount ? parseInt(options.bidAmount, 10) : undefined,
    bid_strategy: options.bidStrategy,
    targeting: parseJsonOption<Record<string, unknown>>(options.targeting, 'targeting'),
    start_time: options.startTime,
    end_time: options.endTime,
    frequency_control_specs: parseJsonOption<
      Array<{ event: 'IMPRESSIONS'; interval_days: number; max_frequency: number }>
    >(options.frequencyControlSpecs ?? options.frequencyCap, 'frequency-cap'),
  };

  if (Object.values(input).every((value) => value === undefined)) {
    throw new CLIError('No update fields provided. Pass at least one update option.');
  }

  const result = await service.update(adsetId, input);
  deps.formatter.output(result, { title: 'Ad Set Updated' });
}

export function registerAdSetsCommand(program: Command): void {
  const adsets = program.command('adsets').description('Ad set management');

  adsets
    .command('list')
    .description('List ad sets')
    .option('--campaign <id>', 'Filter by campaign ID')
    .option('--status <status...>', 'Filter by status')
    .option('--fields <fields...>', 'Custom fields to retrieve')
    .option('--limit <n>', 'Max results', '25')
    .option('--after <cursor>', 'Pagination cursor')
    .option('--all', 'Fetch all pages')
    .action(runCommand(handleAdSetsList));

  adsets.command('get <adset-id>').description('Get ad set details').action(runCommand(handleAdSetsGet));

  adsets
    .command('create')
    .description('Create a new ad set')
    .requiredOption('--campaign-id <id>', 'Parent campaign ID')
    .requiredOption('--name <name>', 'Ad set name')
    .requiredOption('--optimization-goal <goal>', 'Optimization goal')
    .requiredOption('--billing-event <event>', 'Billing event')
    .option('--status <status>', 'Initial status', 'PAUSED')
    .option('--daily-budget <cents>', 'Daily budget in cents')
    .option('--lifetime-budget <cents>', 'Lifetime budget in cents')
    .option('--bid-amount <cents>', 'Bid amount in cents')
    .option('--bid-strategy <strategy>', 'Bid strategy')
    .option('--targeting <json>', 'Targeting spec as JSON string')
    .option('--start-time <iso>', 'Start time (ISO 8601)')
    .option('--end-time <iso>', 'End time (ISO 8601)')
    .option('--destination-type <type>', 'Destination type')
    .option('--promoted-object <json>', 'Promoted object as JSON string')
    .action(runCommand(handleAdSetsCreate));

  adsets
    .command('update <adset-id>')
    .description('Update an ad set')
    .option('--name <name>', 'Ad set name')
    .option('--status <status>', 'Ad set status')
    .option('--daily-budget <cents>', 'Daily budget in cents')
    .option('--lifetime-budget <cents>', 'Lifetime budget in cents')
    .option('--bid-amount <cents>', 'Bid amount in cents')
    .option('--bid-strategy <strategy>', 'Bid strategy')
    .option('--targeting <json>', 'Targeting spec as JSON string')
    .option('--start-time <iso>', 'Start time (ISO 8601)')
    .option('--end-time <iso>', 'End time (ISO 8601)')
    .option('--frequency-cap <json>', 'Frequency control specs as JSON')
    .option('--frequency-control-specs <json>', 'Frequency control specs as JSON')
    .action(runCommand(handleAdSetsUpdate));
}
