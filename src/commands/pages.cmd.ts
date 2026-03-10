import type { Command } from 'commander';

import { createPageService } from '../services/page.service.js';
import { fetchAllPages, printPaginationHint } from '../utils/pagination.js';
import type { CommandDeps } from './shared.js';
import { runCommand } from './shared.js';

interface PagesListOptions {
  fields?: string[];
  limit: string;
  after?: string;
  all?: boolean;
}

async function handlePagesList(deps: CommandDeps, options: PagesListOptions): Promise<void> {
  const service = createPageService(deps);
  const listOptions = {
    fields: options.fields,
    limit: parseInt(options.limit, 10),
    after: options.after,
  };

  if (options.all) {
    const allData = await fetchAllPages((cursor) => service.list({ ...listOptions, after: cursor }));
    deps.formatter.output(allData, {
      columns: ['id', 'name', 'category', 'fan_count'],
      title: 'Pages',
    });
    return;
  }

  const result = await service.list(listOptions);
  deps.formatter.output(result.data, {
    columns: ['id', 'name', 'category', 'fan_count'],
    title: 'Pages',
  });
  printPaginationHint(result.paging);
}

export async function handlePagesInstagram(deps: CommandDeps, pageId: string): Promise<void> {
  const service = createPageService(deps);
  const account = await service.getInstagramAccount(pageId);

  if (!account) {
    const tokenSource = deps.config.sources.meta_access_token;
    const action = !tokenSource
      ? 'Run "lanbow-ads auth login --force" to re-authenticate with the required scope.'
      : `Your token is provided via ${tokenSource}. Replace it with one that includes the instagram_basic permission.`;

    deps.formatter.output(
      {
        page_id: pageId,
        status: 'not_found',
        hint: `No Instagram account found. This can mean the page has no linked Instagram account, or the access token lacks the instagram_basic permission. ${action}`,
      },
      { title: 'Instagram Account' },
    );
    return;
  }

  deps.formatter.output(account, { title: 'Instagram Account' });
}

export function registerPagesCommand(program: Command): void {
  const pages = program.command('pages').description('Facebook Page discovery');

  pages
    .command('list')
    .description('List Pages accessible to the current user')
    .option('--fields <fields...>', 'Custom fields to retrieve')
    .option('--limit <n>', 'Max results', '25')
    .option('--after <cursor>', 'Pagination cursor')
    .option('--all', 'Fetch all pages')
    .action(runCommand(handlePagesList));

  pages
    .command('instagram <page-id>')
    .description('Get the Instagram account linked to a Facebook Page')
    .action(runCommand(handlePagesInstagram));
}
