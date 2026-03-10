import type { Command } from 'commander';

import type { InsightsParams } from '../schemas/insights.js';
import type { BreakdownDimension, DatePreset, InsightsLevel } from '../schemas/enums.js';
import { createInsightsService } from '../services/insights.service.js';
import { printPaginationHint } from '../utils/pagination.js';
import type { CommandDeps } from './shared.js';
import { requireAccountId, runCommand } from './shared.js';

interface InsightsGetOptions {
  campaign?: string;
  adset?: string;
  ad?: string;
  level?: InsightsLevel;
  datePreset?: DatePreset;
  since?: string;
  until?: string;
  breakdowns?: BreakdownDimension[];
  fields?: string[];
  timeIncrement?: string;
  sort?: string[];
  limit: string;
}

async function handleInsightsGet(deps: CommandDeps, options: InsightsGetOptions): Promise<void> {
  const objectId = options.ad ?? options.adset ?? options.campaign ?? requireAccountId(deps.config);
  const service = createInsightsService(deps);

  const params: InsightsParams = {
    level: options.level,
    limit: parseInt(options.limit, 10),
    breakdowns: options.breakdowns,
    fields: options.fields,
    sort: options.sort,
  };

  if (options.datePreset) {
    params.date_preset = options.datePreset;
  } else if (options.since && options.until) {
    params.time_range = { since: options.since, until: options.until };
  }

  if (options.timeIncrement) {
    const n = Number(options.timeIncrement);
    if (!Number.isNaN(n)) {
      params.time_increment = parseInt(options.timeIncrement, 10);
    } else if (options.timeIncrement === 'monthly' || options.timeIncrement === 'all_days') {
      params.time_increment = options.timeIncrement;
    }
  }

  const result = await service.get(objectId, params);

  deps.formatter.output(result.data, {
    columns: ['campaign_name', 'impressions', 'clicks', 'spend', 'ctr', 'cpc', 'cpm'],
    title: 'Performance Insights',
  });

  printPaginationHint(result.paging);
}

export function registerInsightsCommand(program: Command): void {
  const insights = program.command('insights').description('Performance insights');

  insights
    .command('get')
    .description('Get performance insights')
    .option('--campaign <id>', 'Campaign ID')
    .option('--adset <id>', 'Ad set ID')
    .option('--ad <id>', 'Ad ID')
    .option('--level <level>', 'Aggregation level: account, campaign, adset, ad')
    .option('--date-preset <preset>', 'Date preset (e.g., last_7d, last_30d)')
    .option('--since <date>', 'Start date (YYYY-MM-DD)')
    .option('--until <date>', 'End date (YYYY-MM-DD)')
    .option('--breakdowns <dims...>', 'Breakdown dimensions')
    .option('--fields <fields...>', 'Custom fields to retrieve')
    .option('--time-increment <n>', 'Time increment (days or "monthly")')
    .option('--sort <fields...>', 'Sort fields (prefix with - for desc)')
    .option('--limit <n>', 'Max results', '25')
    .action(runCommand(handleInsightsGet));
}
