import { InsightsParamsSchema, type InsightsParams } from '../schemas/insights.js';
import type { GraphAPIClient } from '../client/graph-api.js';
import type { Logger } from '../utils/logger.js';
import { INSIGHTS_FIELDS } from '../types/fields.js';
import type { PaginatedResponse } from '../types/common.js';
import type { InsightsRow } from '../types/responses.js';
import { enrichError } from '../utils/errors.js';
import { pickDefined } from '../utils/params.js';

interface ServiceDeps {
  client: GraphAPIClient;
  logger: Logger;
}

export interface InsightsService {
  get(objectId: string, params: InsightsParams): Promise<PaginatedResponse<InsightsRow>>;
}

export function createInsightsService(deps: ServiceDeps): InsightsService {
  return {
    async get(objectId: string, params: InsightsParams): Promise<PaginatedResponse<InsightsRow>> {
      const validated = InsightsParamsSchema.parse(params);

      const apiParams: Record<string, unknown> = {
        fields: (validated.fields ?? INSIGHTS_FIELDS).join(','),
        limit: validated.limit ?? 25,
      };

      if (validated.date_preset) {
        apiParams.date_preset = validated.date_preset;
      } else if (validated.time_range) {
        apiParams.time_range = validated.time_range;
      }

      Object.assign(apiParams, pickDefined(validated, ['level', 'time_increment']));

      if (validated.breakdowns?.length) {
        apiParams.breakdowns = validated.breakdowns.join(',');
      }
      if (validated.action_attribution_windows?.length) {
        apiParams.action_attribution_windows = validated.action_attribution_windows;
      }
      if (validated.sort?.length) {
        apiParams.sort = validated.sort;
      }
      if (validated.filtering?.length) {
        apiParams.filtering = validated.filtering;
      }

      try {
        return await deps.client.getList<InsightsRow>(`${objectId}/insights`, apiParams);
      } catch (error) {
        throw enrichError(error, `Failed to get insights for ${objectId}`);
      }
    },
  };
}
