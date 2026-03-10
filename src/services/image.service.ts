import { ImageUploadSchema, type ImageUploadInput } from '../schemas/images.js';
import type { GraphAPIClient } from '../client/graph-api.js';
import type { Logger } from '../utils/logger.js';
import type { AdImage } from '../types/responses.js';
import { normalizeAccountId } from '../utils/account.js';
import { enrichError } from '../utils/errors.js';

interface ServiceDeps {
  client: GraphAPIClient;
  logger: Logger;
}

interface AdImageUploadRawResponse {
  images: Record<
    string,
    {
      hash: string;
      url?: string;
      name?: string;
      width?: number;
      height?: number;
    }
  >;
}

export interface ImageService {
  upload(accountId: string, input: ImageUploadInput): Promise<AdImage>;
}

export function createImageService(deps: ServiceDeps): ImageService {
  return {
    async upload(accountId: string, input: ImageUploadInput): Promise<AdImage> {
      const id = normalizeAccountId(accountId);
      const validated = ImageUploadSchema.parse(input);

      const params: Record<string, unknown> = {
        bytes: validated.bytes,
      };
      if (validated.name) {
        params.name = validated.name;
      }

      try {
        const raw = await deps.client.post<AdImageUploadRawResponse>(`${id}/adimages`, params);
        const values = Object.values(raw.images);
        const image = values[0];

        if (!image) {
          throw new Error('No image data in API response');
        }

        return {
          hash: image.hash,
          url: image.url,
          name: image.name,
          width: image.width,
          height: image.height,
        };
      } catch (error) {
        throw enrichError(error, `Failed to upload image to ${id}`);
      }
    },
  };
}
