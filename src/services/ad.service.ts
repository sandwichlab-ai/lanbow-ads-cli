import { AdCreateSchema, AdUpdateSchema, type AdCreateInput, type AdUpdateInput } from '../schemas/ads.js';
import type { GraphAPIClient } from '../client/graph-api.js';
import type { Logger } from '../utils/logger.js';
import { AD_FIELDS } from '../types/fields.js';
import type { PaginationOptions, PaginatedResponse } from '../types/common.js';
import type { Ad } from '../types/responses.js';
import { normalizeAccountId } from '../utils/account.js';
import { enrichError } from '../utils/errors.js';
import { pickDefined } from '../utils/params.js';
import { createCrudBase } from './crud-base.js';

interface ServiceDeps {
  client: GraphAPIClient;
  logger: Logger;
}

export interface AdListOptions extends PaginationOptions {
  effectiveStatus?: string[];
  fields?: string[];
}

export interface AdService {
  list(parentId: string, options?: AdListOptions): Promise<PaginatedResponse<Ad>>;
  get(adId: string): Promise<Ad>;
  create(accountId: string, input: AdCreateInput): Promise<{ id: string }>;
  update(adId: string, input: AdUpdateInput): Promise<{ success: boolean }>;
}

export function createAdService(deps: ServiceDeps): AdService {
  const base = createCrudBase<Ad>({
    resource: 'ads',
    fields: AD_FIELDS,
    client: deps.client,
  });

  return {
    async list(parentId: string, options?: AdListOptions): Promise<PaginatedResponse<Ad>> {
      try {
        return await base.list(parentId, options);
      } catch (error) {
        throw enrichError(error, `Failed to list ads under ${parentId}`);
      }
    },

    async get(adId: string): Promise<Ad> {
      try {
        return await base.get(adId);
      } catch (error) {
        throw enrichError(error, `Failed to get ad ${adId}`);
      }
    },

    async create(accountId: string, input: AdCreateInput): Promise<{ id: string }> {
      const id = normalizeAccountId(accountId);
      const validated = AdCreateSchema.parse(input);

      const params: Record<string, unknown> = {
        name: validated.name,
        adset_id: validated.adset_id,
        status: validated.status ?? 'PAUSED',
      };

      if (validated.creative_id) {
        params.creative = { creative_id: validated.creative_id };
      }

      Object.assign(params, pickDefined(validated, ['tracking_specs', 'conversion_domain', 'bid_amount']));

      try {
        return await deps.client.post<{ id: string }>(`${id}/ads`, params);
      } catch (error) {
        throw enrichError(error, `Failed to create ad "${validated.name}" in ${id}`);
      }
    },

    async update(adId: string, input: AdUpdateInput): Promise<{ success: boolean }> {
      const validated = AdUpdateSchema.parse(input);
      const params: Record<string, unknown> = {};

      Object.assign(params, pickDefined(validated, ['name', 'status', 'bid_amount', 'tracking_specs']));

      if (validated.creative_id) {
        params.creative = { creative_id: validated.creative_id };
      }

      try {
        return await deps.client.post<{ success: boolean }>(adId, params);
      } catch (error) {
        throw enrichError(error, `Failed to update ad ${adId}`);
      }
    },
  };
}
