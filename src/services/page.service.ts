import type { GraphAPIClient } from '../client/graph-api.js';
import type { Logger } from '../utils/logger.js';
import type { PaginationOptions, PaginatedResponse } from '../types/common.js';
import { INSTAGRAM_ACCOUNT_FIELDS, PAGE_FIELDS } from '../types/fields.js';
import type { InstagramAccount, Page } from '../types/responses.js';
import { enrichError } from '../utils/errors.js';

interface ServiceDeps {
  client: GraphAPIClient;
  logger: Logger;
}

export interface PageListOptions extends PaginationOptions {
  fields?: string[];
}

export interface PageService {
  list(options?: PageListOptions): Promise<PaginatedResponse<Page>>;
  getInstagramAccount(pageId: string): Promise<InstagramAccount | null>;
}

export function createPageService(deps: ServiceDeps): PageService {
  return {
    async list(options?: PageListOptions): Promise<PaginatedResponse<Page>> {
      const fields = options?.fields ?? PAGE_FIELDS;
      const params: Record<string, unknown> = {
        fields: Array.isArray(fields) ? fields.join(',') : fields,
        limit: options?.limit ?? 25,
      };

      if (options?.after) {
        params.after = options.after;
      }
      if (options?.before) {
        params.before = options.before;
      }

      try {
        return await deps.client.getList<Page>('me/accounts', params);
      } catch (error) {
        throw enrichError(error, 'Failed to list pages');
      }
    },

    async getInstagramAccount(pageId: string): Promise<InstagramAccount | null> {
      const fields = `instagram_business_account{${INSTAGRAM_ACCOUNT_FIELDS.join(',')}}`;

      try {
        const result = await deps.client.getObject<{
          instagram_business_account?: InstagramAccount;
        }>(pageId, { fields });

        return result.instagram_business_account ?? null;
      } catch (error) {
        throw enrichError(error, `Failed to get Instagram account for page ${pageId}`);
      }
    },
  };
}
