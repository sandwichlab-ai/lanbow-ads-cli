import { AdSetCreateSchema, AdSetUpdateSchema, type AdSetCreateInput, type AdSetUpdateInput } from '../schemas/adsets.js';
import type { GraphAPIClient } from '../client/graph-api.js';
import type { Logger } from '../utils/logger.js';
import { ADSET_FIELDS } from '../types/fields.js';
import type { PaginationOptions, PaginatedResponse } from '../types/common.js';
import type { AdSet } from '../types/responses.js';
import { normalizeAccountId } from '../utils/account.js';
import { enrichError } from '../utils/errors.js';
import { pickDefined } from '../utils/params.js';
import { createCrudBase } from './crud-base.js';

interface ServiceDeps {
  client: GraphAPIClient;
  logger: Logger;
}

function ensureAdvantageAudienceFlag(targeting: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!targeting) {
    return undefined;
  }

  if ('targeting_automation' in targeting) {
    return targeting;
  }

  return {
    ...targeting,
    targeting_automation: {
      advantage_audience: 0,
    },
  };
}

export interface AdSetListOptions extends PaginationOptions {
  effectiveStatus?: string[];
  fields?: string[];
}

export interface AdSetService {
  list(parentId: string, options?: AdSetListOptions): Promise<PaginatedResponse<AdSet>>;
  get(adsetId: string): Promise<AdSet>;
  create(accountId: string, input: AdSetCreateInput): Promise<{ id: string }>;
  update(adsetId: string, input: AdSetUpdateInput): Promise<{ success: boolean }>;
}

export function createAdSetService(deps: ServiceDeps): AdSetService {
  const base = createCrudBase<AdSet>({
    resource: 'adsets',
    fields: ADSET_FIELDS,
    client: deps.client,
  });

  return {
    async list(parentId: string, options?: AdSetListOptions): Promise<PaginatedResponse<AdSet>> {
      try {
        return await base.list(parentId, options);
      } catch (error) {
        throw enrichError(error, `Failed to list ad sets under ${parentId}`);
      }
    },

    async get(adsetId: string): Promise<AdSet> {
      try {
        return await base.get(adsetId);
      } catch (error) {
        throw enrichError(error, `Failed to get ad set ${adsetId}`);
      }
    },

    async create(accountId: string, input: AdSetCreateInput): Promise<{ id: string }> {
      const id = normalizeAccountId(accountId);
      const validated = AdSetCreateSchema.parse(input);
      const targetingWithAutomation = ensureAdvantageAudienceFlag(validated.targeting);

      const params: Record<string, unknown> = {
        campaign_id: validated.campaign_id,
        name: validated.name,
        optimization_goal: validated.optimization_goal,
        billing_event: validated.billing_event,
        status: validated.status ?? 'PAUSED',
      };

      Object.assign(
        params,
        pickDefined(validated, [
          'daily_budget',
          'lifetime_budget',
          'bid_amount',
          'bid_strategy',
          'bid_constraints',
          'start_time',
          'end_time',
          'destination_type',
          'promoted_object',
          'is_dynamic_creative',
          'frequency_control_specs',
        ]),
      );

      if (targetingWithAutomation) {
        params.targeting = targetingWithAutomation;
      }

      try {
        return await deps.client.post<{ id: string }>(`${id}/adsets`, params);
      } catch (error) {
        throw enrichError(error, `Failed to create ad set "${validated.name}" in ${id}`);
      }
    },

    async update(adsetId: string, input: AdSetUpdateInput): Promise<{ success: boolean }> {
      const validated = AdSetUpdateSchema.parse(input);
      const targetingWithAutomation = ensureAdvantageAudienceFlag(validated.targeting);
      const params: Record<string, unknown> = {};

      Object.assign(
        params,
        pickDefined(validated, [
          'name',
          'status',
          'daily_budget',
          'lifetime_budget',
          'bid_amount',
          'bid_strategy',
          'bid_constraints',
          'start_time',
          'end_time',
          'frequency_control_specs',
        ]),
      );

      if (targetingWithAutomation) {
        params.targeting = targetingWithAutomation;
      }

      try {
        return await deps.client.post<{ success: boolean }>(adsetId, params);
      } catch (error) {
        throw enrichError(error, `Failed to update ad set ${adsetId}`);
      }
    },
  };
}
