import type { PaginationOptions, PaginatedResponse } from '../types/common.js';
import { ACCOUNT_FIELDS } from '../types/fields.js';
import type { AdAccount } from '../types/responses.js';
import { normalizeAccountId } from '../utils/account.js';
import { enrichError } from '../utils/errors.js';
import type { GraphAPIClient } from '../client/graph-api.js';
import type { Logger } from '../utils/logger.js';

interface ServiceDeps {
  client: GraphAPIClient;
  logger: Logger;
}

export interface AccountService {
  list(options?: PaginationOptions): Promise<PaginatedResponse<AdAccount>>;
  get(accountId: string): Promise<AdAccount>;
}

export function createAccountService(deps: ServiceDeps): AccountService {
  return {
    async list(options?: PaginationOptions): Promise<PaginatedResponse<AdAccount>> {
      const params: Record<string, unknown> = {
        fields: ACCOUNT_FIELDS.join(','),
        limit: options?.limit ?? 25,
      };
      if (options?.after) {
        params.after = options.after;
      }
      if (options?.before) {
        params.before = options.before;
      }

      try {
        return await deps.client.getList<AdAccount>('me/adaccounts', params);
      } catch (error) {
        throw enrichError(error, 'Failed to list ad accounts');
      }
    },

    async get(accountId: string): Promise<AdAccount> {
      const id = normalizeAccountId(accountId);
      try {
        return await deps.client.getObject<AdAccount>(id, {
          fields: ACCOUNT_FIELDS.join(','),
        });
      } catch (error) {
        throw enrichError(error, `Failed to get account ${id}`);
      }
    },
  };
}
