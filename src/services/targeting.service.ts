import { CLIError } from '../client/errors.js';
import type { GraphAPIClient } from '../client/graph-api.js';
import type { PaginatedResponse } from '../types/common.js';
import type {
  AudienceEstimate,
  TargetingCategory,
  TargetingInterest,
  TargetingLocation,
} from '../types/responses.js';
import { normalizeAccountId } from '../utils/account.js';
import { enrichError } from '../utils/errors.js';
import type { Logger } from '../utils/logger.js';

interface ServiceDeps {
  client: GraphAPIClient;
  logger: Logger;
}

export interface TargetingService {
  findInterests(
    query: string,
    options?: { limit?: number },
  ): Promise<PaginatedResponse<TargetingInterest>>;
  suggestInterests(
    interests: string[],
    options?: { limit?: number },
  ): Promise<PaginatedResponse<TargetingInterest>>;
  findLocations(
    query: string,
    options?: { locationTypes?: string[]; limit?: number },
  ): Promise<PaginatedResponse<TargetingLocation>>;
  listBehaviors(options?: { limit?: number }): Promise<PaginatedResponse<TargetingCategory>>;
  listDemographics(
    options?: { demographicClass?: string; limit?: number },
  ): Promise<PaginatedResponse<TargetingCategory>>;
  estimateReach(accountId: string, targeting: Record<string, unknown>): Promise<AudienceEstimate>;
}

export function createTargetingService(deps: ServiceDeps): TargetingService {
  return {
    async findInterests(query: string, options?: { limit?: number }): Promise<PaginatedResponse<TargetingInterest>> {
      if (!query.trim()) {
        throw new CLIError('Search query is required');
      }

      try {
        return await deps.client.getList<TargetingInterest>('search', {
          type: 'adinterest',
          q: query,
          limit: options?.limit ?? 25,
        });
      } catch (error) {
        throw enrichError(error, `Failed to find interests for "${query}"`);
      }
    },

    async suggestInterests(
      interests: string[],
      options?: { limit?: number },
    ): Promise<PaginatedResponse<TargetingInterest>> {
      if (!interests.length) {
        throw new CLIError('At least one interest is required');
      }

      try {
        return await deps.client.getList<TargetingInterest>('search', {
          type: 'adinterestsuggestion',
          interest_list: interests,
          limit: options?.limit ?? 25,
        });
      } catch (error) {
        throw enrichError(error, 'Failed to suggest interests');
      }
    },

    async findLocations(
      query: string,
      options?: { locationTypes?: string[]; limit?: number },
    ): Promise<PaginatedResponse<TargetingLocation>> {
      if (!query.trim()) {
        throw new CLIError('Search query is required');
      }

      const params: Record<string, unknown> = {
        type: 'adgeolocation',
        q: query,
        limit: options?.limit ?? 25,
      };

      if (options?.locationTypes?.length) {
        params.location_types = options.locationTypes;
      }

      try {
        return await deps.client.getList<TargetingLocation>('search', params);
      } catch (error) {
        throw enrichError(error, `Failed to find locations for "${query}"`);
      }
    },

    async listBehaviors(options?: { limit?: number }): Promise<PaginatedResponse<TargetingCategory>> {
      try {
        return await deps.client.getList<TargetingCategory>('search', {
          type: 'adTargetingCategory',
          class: 'behaviors',
          limit: options?.limit ?? 50,
        });
      } catch (error) {
        throw enrichError(error, 'Failed to list behaviors');
      }
    },

    async listDemographics(
      options?: { demographicClass?: string; limit?: number },
    ): Promise<PaginatedResponse<TargetingCategory>> {
      try {
        return await deps.client.getList<TargetingCategory>('search', {
          type: 'adTargetingCategory',
          class: options?.demographicClass ?? 'demographics',
          limit: options?.limit ?? 50,
        });
      } catch (error) {
        throw enrichError(error, 'Failed to list demographics');
      }
    },

    async estimateReach(accountId: string, targeting: Record<string, unknown>): Promise<AudienceEstimate> {
      const id = normalizeAccountId(accountId);

      try {
        const result = await deps.client.getObject<{ data: AudienceEstimate }>(`${id}/reachestimate`, {
          targeting_spec: targeting,
        });
        return result.data;
      } catch (error) {
        throw enrichError(error, `Failed to estimate reach for ${id}`);
      }
    },
  };
}
