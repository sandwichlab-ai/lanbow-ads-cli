import type { Command } from 'commander';

import { createAccountService } from '../services/account.service.js';
import type { PaginationOptions } from '../types/common.js';
import type { AdAccount } from '../types/responses.js';
import { centsToAmount } from '../utils/monetary.js';
import { fetchAllPages, printPaginationHint } from '../utils/pagination.js';
import type { CommandDeps } from './shared.js';
import { runCommand } from './shared.js';

interface AccountsListOptions {
  limit: string;
  after?: string;
  all?: boolean;
}

async function handleAccountsList(deps: CommandDeps, options: AccountsListOptions): Promise<void> {
  const service = createAccountService(deps);

  const paginationOpts: PaginationOptions = {
    limit: parseInt(options.limit, 10),
    after: options.after,
  };

  if (options.all) {
    const allData = await fetchAllPages((cursor) => service.list({ ...paginationOpts, after: cursor }));
    deps.formatter.output(allData, {
      columns: ['id', 'name', 'account_status', 'currency', 'timezone_name'],
      title: 'Ad Accounts',
    });
    return;
  }

  const result = await service.list(paginationOpts);
  deps.formatter.output(result.data, {
    columns: ['id', 'name', 'account_status', 'currency', 'timezone_name'],
    title: 'Ad Accounts',
  });
  printPaginationHint(result.paging);
}

async function handleAccountsInfo(deps: CommandDeps, accountId: string): Promise<void> {
  const service = createAccountService(deps);
  const account = await service.get(accountId);

  deps.formatter.output(account, {
    title: `Account: ${account.name}`,
    transform: (a: AdAccount) => ({
      ...a,
      amount_spent: centsToAmount(a.amount_spent, a.currency),
      balance: centsToAmount(a.balance, a.currency),
    }),
  });
}

export function registerAccountsCommand(program: Command): void {
  const accounts = program.command('accounts').description('Ad account management');

  accounts
    .command('list')
    .description('List accessible ad accounts')
    .option('--limit <n>', 'Max results', '25')
    .option('--after <cursor>', 'Pagination cursor')
    .option('--all', 'Fetch all pages')
    .action(runCommand(handleAccountsList));

  accounts.command('info <account-id>').description('Get ad account details').action(runCommand(handleAccountsInfo));
}
