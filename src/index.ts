import { Command } from 'commander';

import { registerAccountsCommand } from './commands/accounts.cmd.js';
import { registerAdSetsCommand } from './commands/adsets.cmd.js';
import { registerAdsCommand } from './commands/ads.cmd.js';
import { registerAuthCommand } from './commands/auth.cmd.js';
import { registerCampaignsCommand } from './commands/campaigns.cmd.js';
import { registerCreativesCommand } from './commands/creatives.cmd.js';
import { registerConfigCommand } from './commands/config.cmd.js';
import { registerImagesCommand } from './commands/images.cmd.js';
import { registerInsightsCommand } from './commands/insights.cmd.js';
import { registerPagesCommand } from './commands/pages.cmd.js';
import { registerTargetingCommand } from './commands/targeting.cmd.js';
import { registerVideosCommand } from './commands/videos.cmd.js';

const program = new Command();

program
  .name('lanbow-ads')
  .description('CLI for Meta (Facebook/Instagram) Ads management')
  .version('0.1.0')
  .option('--json', 'Output as JSON')
  .option('--format <format>', 'Output format: table or json')
  .option('--verbose', 'Enable verbose logging')
  .option('--account <id>', 'Ad account ID or alias')
  .option('--access-token <token>', 'Access token (overrides stored token)');

registerAuthCommand(program);
registerConfigCommand(program);
registerAccountsCommand(program);
registerCampaignsCommand(program);
registerAdSetsCommand(program);
registerAdsCommand(program);
registerCreativesCommand(program);
registerImagesCommand(program);
registerVideosCommand(program);
registerInsightsCommand(program);
registerPagesCommand(program);
registerTargetingCommand(program);

program.parse();
