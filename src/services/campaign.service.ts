import { CampaignCreateSchema, CampaignUpdateSchema, type CampaignCreateInput, type CampaignUpdateInput } from '../schemas/campaigns.js';
import type { PaginationOptions, PaginatedResponse } from '../types/common.js';
import type { GraphAPIClient } from '../client/graph-api.js';
import type { Logger } from '../utils/logger.js';
import { CAMPAIGN_FIELDS } from '../types/fields.js';
import type { Campaign } from '../types/responses.js';
import { normalizeAccountId } from '../utils/account.js';
import { enrichError } from '../utils/errors.js';
import { pickDefined } from '../utils/params.js';
import { createCrudBase } from './crud-base.js';
import type { CampaignObjective } from '../schemas/enums.js';

interface ServiceDeps {
  client: GraphAPIClient;
  logger: Logger;
}

export interface CampaignListOptions extends PaginationOptions {
  effectiveStatus?: string[];
  objective?: CampaignObjective;
  fields?: string[];
}

export interface CampaignService {
  list(accountId: string, options?: CampaignListOptions): Promise<PaginatedResponse<Campaign>>;
  get(campaignId: string): Promise<Campaign>;
  create(accountId: string, input: CampaignCreateInput): Promise<{ id: string }>;
  update(campaignId: string, input: CampaignUpdateInput): Promise<{ success: boolean }>;
}

export function createCampaignService(deps: ServiceDeps): CampaignService {
  const base = createCrudBase<Campaign>({
    resource: 'campaigns',
    fields: CAMPAIGN_FIELDS,
    client: deps.client,
  });

  return {
    async list(accountId: string, options?: CampaignListOptions): Promise<PaginatedResponse<Campaign>> {
      const id = normalizeAccountId(accountId);

      const extraParams: Record<string, unknown> = {};
      if (options?.objective) {
        extraParams.filtering = [{ field: 'objective', operator: 'IN', value: [options.objective] }];
      }

      try {
        return await base.list(id, {
          ...options,
          extraParams: Object.keys(extraParams).length ? extraParams : undefined,
        });
      } catch (error) {
        throw enrichError(error, `Failed to list campaigns for ${id}`);
      }
    },

    async get(campaignId: string): Promise<Campaign> {
      try {
        return await base.get(campaignId);
      } catch (error) {
        throw enrichError(error, `Failed to get campaign ${campaignId}`);
      }
    },

    async create(accountId: string, input: CampaignCreateInput): Promise<{ id: string }> {
      const id = normalizeAccountId(accountId);
      const validated = CampaignCreateSchema.parse(input);

      const params: Record<string, unknown> = {
        name: validated.name,
        objective: validated.objective,
        status: validated.status,
        special_ad_categories: validated.special_ad_categories,
      };

      if (!validated.use_adset_level_budgets) {
        Object.assign(params, pickDefined(validated, ['daily_budget', 'lifetime_budget']));
      } else {
        // Meta API v24 requires this flag when campaign-level budgets are omitted (ABO mode).
        params.is_adset_budget_sharing_enabled = false;
      }

      if (validated.bid_strategy) {
        Object.assign(params, pickDefined(validated, ['bid_strategy', 'bid_cap', 'bid_constraints']));
      }

      if (validated.special_ad_category_country) {
        params.special_ad_category_country = validated.special_ad_category_country;
      }

      try {
        return await deps.client.post<{ id: string }>(`${id}/campaigns`, params);
      } catch (error) {
        throw enrichError(error, `Failed to create campaign "${validated.name}" in ${id}`);
      }
    },

    async update(campaignId: string, input: CampaignUpdateInput): Promise<{ success: boolean }> {
      const validated = CampaignUpdateSchema.parse(input);
      const params: Record<string, unknown> = {};

      Object.assign(
        params,
        pickDefined(validated, [
          'name',
          'status',
          'daily_budget',
          'lifetime_budget',
          'bid_strategy',
          'bid_cap',
          'bid_constraints',
        ]),
      );

      try {
        return await deps.client.post<{ success: boolean }>(campaignId, params);
      } catch (error) {
        throw enrichError(error, `Failed to update campaign ${campaignId}`);
      }
    },
  };
}
