import type { Command } from 'commander';

import { CLIError } from '../client/errors.js';
import { createTargetingService } from '../services/targeting.service.js';
import { printPaginationHint } from '../utils/pagination.js';
import type { CommandDeps } from './shared.js';
import { parseJsonOption, requireAccountId, runCommand } from './shared.js';

interface LimitOptions {
  limit: string;
}

interface SuggestionsOptions extends LimitOptions {
  interests: string[];
}

interface LocationOptions extends LimitOptions {
  type?: string[];
}

interface DemographicsOptions extends LimitOptions {
  class: string;
}

interface EstimateOptions {
  targeting: string;
}

async function handleInterests(deps: CommandDeps, query: string, options: LimitOptions): Promise<void> {
  const service = createTargetingService(deps);
  const result = await service.findInterests(query, {
    limit: parseInt(options.limit, 10),
  });
  deps.formatter.output(result.data, {
    columns: ['id', 'name', 'audience_size', 'path'],
    title: 'Interest Targeting Options',
  });
  printPaginationHint(result.paging);
}

async function handleSuggestions(deps: CommandDeps, options: SuggestionsOptions): Promise<void> {
  const service = createTargetingService(deps);
  const result = await service.suggestInterests(options.interests, {
    limit: parseInt(options.limit, 10),
  });
  deps.formatter.output(result.data, {
    columns: ['id', 'name', 'audience_size', 'description'],
    title: 'Interest Suggestions',
  });
  printPaginationHint(result.paging);
}

async function handleLocations(deps: CommandDeps, query: string, options: LocationOptions): Promise<void> {
  const service = createTargetingService(deps);
  const result = await service.findLocations(query, {
    locationTypes: options.type,
    limit: parseInt(options.limit, 10),
  });
  deps.formatter.output(result.data, {
    columns: ['key', 'name', 'type', 'country_code'],
    title: 'Geographic Locations',
  });
  printPaginationHint(result.paging);
}

async function handleBehaviors(deps: CommandDeps, options: LimitOptions): Promise<void> {
  const service = createTargetingService(deps);
  const result = await service.listBehaviors({ limit: parseInt(options.limit, 10) });
  deps.formatter.output(result.data, {
    columns: ['id', 'name', 'audience_size_lower_bound', 'path'],
    title: 'Behavior Targeting Options',
  });
  printPaginationHint(result.paging);
}

async function handleDemographics(deps: CommandDeps, options: DemographicsOptions): Promise<void> {
  const service = createTargetingService(deps);
  const result = await service.listDemographics({
    demographicClass: options.class,
    limit: parseInt(options.limit, 10),
  });
  deps.formatter.output(result.data, {
    columns: ['id', 'name', 'audience_size_lower_bound', 'path'],
    title: `Demographic Targeting: ${options.class}`,
  });
  printPaginationHint(result.paging);
}

async function handleEstimate(deps: CommandDeps, options: EstimateOptions): Promise<void> {
  const targeting = parseJsonOption<Record<string, unknown>>(options.targeting, 'targeting');
  if (!targeting) {
    throw new CLIError('--targeting is required');
  }

  const service = createTargetingService(deps);
  const accountId = requireAccountId(deps.config);
  const result = await service.estimateReach(accountId, targeting);
  deps.formatter.output(result, { title: 'Audience Size Estimate' });
}

export function registerTargetingCommand(program: Command): void {
  const targeting = program.command('targeting').description('Targeting search and estimation');

  targeting
    .command('interests <query>')
    .description('Search interest targeting options')
    .option('--limit <n>', 'Max results', '25')
    .action(runCommand(handleInterests));

  targeting
    .command('suggestions')
    .description('Get interest suggestions from existing interests')
    .requiredOption('--interests <names...>', 'Interest names to get suggestions for')
    .option('--limit <n>', 'Max results', '25')
    .action(runCommand(handleSuggestions));

  targeting
    .command('locations <query>')
    .description('Search geographic locations')
    .option('--type <types...>', 'Location types: country, region, city, zip, geo_market')
    .option('--limit <n>', 'Max results', '25')
    .action(runCommand(handleLocations));

  targeting
    .command('behaviors')
    .description('List behavior targeting options')
    .option('--limit <n>', 'Max results', '50')
    .action(runCommand(handleBehaviors));

  targeting
    .command('demographics')
    .description('List demographic targeting options')
    .option(
      '--class <class>',
      'Category: demographics, life_events, industries, income, family_statuses, user_device, user_os',
      'demographics',
    )
    .option('--limit <n>', 'Max results', '50')
    .action(runCommand(handleDemographics));

  targeting
    .command('estimate')
    .description('Estimate audience size for a targeting spec')
    .requiredOption('--targeting <json>', 'Targeting spec as JSON')
    .action(runCommand(handleEstimate));
}
