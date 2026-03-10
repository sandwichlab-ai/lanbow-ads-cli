import { CreativeCreateSchema, CreativeUpdateSchema, type CreativeCreateInput, type CreativeUpdateInput } from '../schemas/creatives.js';
import type { GraphAPIClient } from '../client/graph-api.js';
import type { Logger } from '../utils/logger.js';
import { CREATIVE_FIELDS, CREATIVE_LIST_FIELDS } from '../types/fields.js';
import type { PaginationOptions, PaginatedResponse } from '../types/common.js';
import type { AdCreative } from '../types/responses.js';
import { normalizeAccountId } from '../utils/account.js';
import { enrichError } from '../utils/errors.js';
import { createCrudBase } from './crud-base.js';

interface ServiceDeps {
  client: GraphAPIClient;
  logger: Logger;
}

export interface CreativeListOptions extends PaginationOptions {
  fields?: string[];
}

export interface CreativeService {
  list(parentId: string, options?: CreativeListOptions): Promise<PaginatedResponse<AdCreative>>;
  get(creativeId: string): Promise<AdCreative>;
  create(accountId: string, input: CreativeCreateInput): Promise<{ id: string }>;
  update(creativeId: string, input: CreativeUpdateInput): Promise<{ success: boolean }>;
}

export function createCreativeService(deps: ServiceDeps): CreativeService {
  const base = createCrudBase<AdCreative>({
    resource: 'adcreatives',
    fields: CREATIVE_LIST_FIELDS,
    client: deps.client,
  });

  return {
    async list(parentId: string, options?: CreativeListOptions): Promise<PaginatedResponse<AdCreative>> {
      try {
        return await base.list(parentId, options);
      } catch (error) {
        throw enrichError(error, `Failed to list creatives under ${parentId}`);
      }
    },

    async get(creativeId: string): Promise<AdCreative> {
      try {
        return await deps.client.getObject<AdCreative>(creativeId, {
          fields: CREATIVE_FIELDS.join(','),
        });
      } catch (error) {
        throw enrichError(error, `Failed to get creative ${creativeId}`);
      }
    },

    async create(accountId: string, input: CreativeCreateInput): Promise<{ id: string }> {
      const id = normalizeAccountId(accountId);
      const validated = CreativeCreateSchema.parse(input);

      const params: Record<string, unknown> = { name: validated.name };

      if (validated.object_story_spec) {
        params.object_story_spec = validated.object_story_spec;
      } else if (validated.asset_feed_spec) {
        params.asset_feed_spec = validated.asset_feed_spec;
      } else if (validated.video_id) {
        const videoData: Record<string, unknown> = {
          video_id: validated.video_id,
        };

        if (validated.image_hash) {
          videoData.image_hash = validated.image_hash;
        }
        if (validated.message) {
          videoData.message = validated.message;
        }
        if (validated.headline) {
          videoData.title = validated.headline;
        }
        if (validated.description) {
          videoData.description = validated.description;
        }

        videoData.call_to_action = {
          type: validated.call_to_action ?? 'LEARN_MORE',
          value: { link: validated.link },
        };

        params.object_story_spec = {
          page_id: validated.page_id,
          video_data: videoData,
        };
      } else {
        const linkData: Record<string, unknown> = {
          image_hash: validated.image_hash,
          link: validated.link,
        };

        if (validated.message) {
          linkData.message = validated.message;
        }
        if (validated.headline) {
          linkData.name = validated.headline;
        }
        if (validated.description) {
          linkData.description = validated.description;
        }
        if (validated.call_to_action) {
          linkData.call_to_action = { type: validated.call_to_action };
        }

        params.object_story_spec = {
          page_id: validated.page_id,
          link_data: linkData,
        };
      }

      if (validated.instagram_actor_id) {
        params.instagram_actor_id = validated.instagram_actor_id;
      }

      try {
        return await deps.client.post<{ id: string }>(`${id}/adcreatives`, params);
      } catch (error) {
        throw enrichError(error, `Failed to create creative "${validated.name}" in ${id}`);
      }
    },

    async update(creativeId: string, input: CreativeUpdateInput): Promise<{ success: boolean }> {
      const validated = CreativeUpdateSchema.parse(input);

      try {
        return await deps.client.post<{ success: boolean }>(creativeId, {
          name: validated.name,
        });
      } catch (error) {
        throw enrichError(error, `Failed to update creative ${creativeId}`);
      }
    },
  };
}
