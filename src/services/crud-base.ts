import type { GraphAPIClient } from '../client/graph-api.js';
import type { PaginationOptions, PaginatedResponse } from '../types/common.js';

interface CrudConfig<T> {
  resource: string;
  fields: readonly string[];
  client: GraphAPIClient;
}

export interface ListOptions extends PaginationOptions {
  effectiveStatus?: string[];
  fields?: string[];
  extraParams?: Record<string, unknown>;
}

export function createCrudBase<T>(config: CrudConfig<T>) {
  return {
    async list(parentId: string, options?: ListOptions): Promise<PaginatedResponse<T>> {
      const fields = options?.fields ?? config.fields;
      const params: Record<string, unknown> = {
        fields: Array.isArray(fields) ? fields.join(',') : fields,
        limit: options?.limit ?? 25,
      };

      if (options?.effectiveStatus?.length) {
        params.effective_status = options.effectiveStatus;
      }
      if (options?.after) {
        params.after = options.after;
      }
      if (options?.before) {
        params.before = options.before;
      }
      if (options?.extraParams) {
        Object.assign(params, options.extraParams);
      }

      return config.client.getList<T>(`${parentId}/${config.resource}`, params);
    },

    async get(id: string): Promise<T> {
      return config.client.getObject<T>(id, {
        fields: config.fields.join(','),
      });
    },
  };
}
