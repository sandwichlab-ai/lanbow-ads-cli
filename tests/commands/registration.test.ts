import { describe, expect, it } from 'vitest';
import { Command } from 'commander';

import { registerAccountsCommand } from '../../src/commands/accounts.cmd.js';
import { registerAdSetsCommand } from '../../src/commands/adsets.cmd.js';
import { registerAdsCommand } from '../../src/commands/ads.cmd.js';
import { registerAuthCommand } from '../../src/commands/auth.cmd.js';
import { registerCampaignsCommand } from '../../src/commands/campaigns.cmd.js';
import { registerConfigCommand } from '../../src/commands/config.cmd.js';
import { registerCreativesCommand } from '../../src/commands/creatives.cmd.js';
import { registerImagesCommand } from '../../src/commands/images.cmd.js';
import { registerInsightsCommand } from '../../src/commands/insights.cmd.js';
import { registerPagesCommand } from '../../src/commands/pages.cmd.js';
import { registerTargetingCommand } from '../../src/commands/targeting.cmd.js';
import { registerVideosCommand } from '../../src/commands/videos.cmd.js';

function findCommand(parent: Command, name: string): Command {
  const cmd = parent.commands.find((c) => c.name() === name);
  if (!cmd) throw new Error(`command not found: ${name}`);
  return cmd;
}

function countLeafCommands(command: Command): number {
  if (command.commands.length === 0) return 1;
  return command.commands.reduce((sum, c) => sum + countLeafCommands(c), 0);
}

describe('command registration', () => {
  it('registers all command groups and expected subcommands', () => {
    const program = new Command();

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

    expect(program.commands.map((c) => c.name())).toEqual([
      'auth',
      'config',
      'accounts',
      'campaigns',
      'adsets',
      'ads',
      'creatives',
      'images',
      'videos',
      'insights',
      'pages',
      'targeting',
    ]);

    expect(findCommand(program, 'auth').commands.map((c) => c.name())).toEqual([
      'login',
      'logout',
      'exchange',
      'status',
    ]);

    expect(findCommand(program, 'config').commands.map((c) => c.name())).toEqual([
      'set',
      'get',
      'list',
      'unset',
      'accounts',
    ]);

    expect(findCommand(findCommand(program, 'config'), 'accounts').commands.map((c) => c.name())).toEqual([
      'list',
      'add',
      'remove',
    ]);

    expect(findCommand(program, 'accounts').commands.map((c) => c.name())).toEqual([
      'list',
      'info',
    ]);

    expect(findCommand(program, 'campaigns').commands.map((c) => c.name())).toEqual([
      'list',
      'get',
      'create',
      'update',
    ]);

    expect(findCommand(program, 'adsets').commands.map((c) => c.name())).toEqual([
      'list',
      'get',
      'create',
      'update',
    ]);

    expect(findCommand(program, 'ads').commands.map((c) => c.name())).toEqual([
      'list',
      'get',
      'create',
      'update',
    ]);

    expect(findCommand(program, 'insights').commands.map((c) => c.name())).toEqual(['get']);

    expect(findCommand(program, 'creatives').commands.map((c) => c.name())).toEqual([
      'list',
      'get',
      'create',
      'update',
    ]);

    expect(findCommand(program, 'images').commands.map((c) => c.name())).toEqual(['upload']);
    expect(findCommand(program, 'videos').commands.map((c) => c.name())).toEqual(['upload']);
    expect(findCommand(program, 'pages').commands.map((c) => c.name())).toEqual(['list', 'instagram']);
    expect(findCommand(program, 'targeting').commands.map((c) => c.name())).toEqual([
      'interests',
      'suggestions',
      'locations',
      'behaviors',
      'demographics',
      'estimate',
    ]);
  });

  it('registers 40 leaf commands in phase 2', () => {
    const program = new Command();

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

    const leafCount = program.commands.reduce((sum, group) => sum + countLeafCommands(group), 0);
    expect(leafCount).toBe(40);
  });
});
