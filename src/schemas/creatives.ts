import { z } from 'zod';

export const CreativeCreateSchema = z
  .object({
    name: z.string().min(1).max(400),

    page_id: z.string().min(1).optional(),
    image_hash: z.string().min(1).optional(),
    video_id: z.string().min(1).optional(),
    link: z.string().url().optional(),
    message: z.string().optional(),
    headline: z.string().optional(),
    description: z.string().optional(),
    call_to_action: z.string().optional(),
    instagram_actor_id: z.string().optional(),

    object_story_spec: z.record(z.unknown()).optional(),
    asset_feed_spec: z.record(z.unknown()).optional(),
  })
  .refine(
    (d) => {
      const hasAnySimple = Boolean(d.page_id || d.image_hash || d.video_id || d.link);
      const hasObjectStory = d.object_story_spec != null;
      const hasAssetFeed = d.asset_feed_spec != null;
      return [hasAnySimple, hasObjectStory, hasAssetFeed].filter(Boolean).length === 1;
    },
    {
      message:
        'Use one mode: (a) --page-id + --image-hash + --link (image) or --page-id + --video-id + --link (video), (b) --object-story-spec, or (c) --asset-feed-spec',
    },
  )
  .refine(
    (d) => {
      if (d.page_id || d.image_hash || d.video_id || d.link) {
        if (d.video_id) {
          return Boolean(d.page_id && d.link);
        }
        return Boolean(d.page_id && d.image_hash && d.link);
      }
      return true;
    },
    {
      message: 'Image mode requires: --page-id, --image-hash, --link. Video mode requires: --page-id, --video-id, --link.',
    },
  );

export type CreativeCreateInput = z.infer<typeof CreativeCreateSchema>;

export const CreativeUpdateSchema = z.object({
  name: z.string().min(1).max(400),
});

export type CreativeUpdateInput = z.infer<typeof CreativeUpdateSchema>;
