import { describe, expect, it } from 'vitest';

import { CreativeCreateSchema, CreativeUpdateSchema } from '../../src/schemas/creatives.js';

describe('Creative schemas', () => {
  it('accepts simple link ad mode', () => {
    const parsed = CreativeCreateSchema.parse({
      name: 'Creative Simple',
      page_id: '123',
      image_hash: 'abc_hash',
      link: 'https://example.com',
      headline: 'Headline',
      call_to_action: 'LEARN_MORE',
    });

    expect(parsed.page_id).toBe('123');
    expect(parsed.image_hash).toBe('abc_hash');
    expect(parsed.link).toBe('https://example.com');
  });

  it('accepts simple video ad mode without image_hash', () => {
    const parsed = CreativeCreateSchema.parse({
      name: 'Creative Video',
      page_id: '123',
      video_id: 'vid_1',
      link: 'https://example.com/video',
      headline: 'Video Headline',
    });

    expect(parsed.page_id).toBe('123');
    expect(parsed.video_id).toBe('vid_1');
    expect(parsed.image_hash).toBeUndefined();
    expect(parsed.link).toBe('https://example.com/video');
  });

  it('accepts object_story_spec mode', () => {
    const parsed = CreativeCreateSchema.parse({
      name: 'Creative OSS',
      object_story_spec: {
        page_id: '123',
        link_data: { link: 'https://example.com', image_hash: 'h1' },
      },
    });

    expect(parsed.object_story_spec).toBeDefined();
  });

  it('accepts asset_feed_spec mode', () => {
    const parsed = CreativeCreateSchema.parse({
      name: 'Creative Dynamic',
      asset_feed_spec: {
        titles: [{ text: 'Title 1' }],
        bodies: [{ text: 'Body 1' }],
        images: [{ hash: 'img_hash_1' }],
      },
    });

    expect(parsed.asset_feed_spec).toBeDefined();
  });

  it('rejects mixed modes', () => {
    expect(() =>
      CreativeCreateSchema.parse({
        name: 'Creative Mixed',
        page_id: '123',
        image_hash: 'abc_hash',
        link: 'https://example.com',
        object_story_spec: { page_id: '999' },
      }),
    ).toThrow(/Use one mode/);
  });

  it('rejects mixing video simple mode with object_story_spec', () => {
    expect(() =>
      CreativeCreateSchema.parse({
        name: 'Creative Mixed Video',
        page_id: '123',
        video_id: 'vid_1',
        link: 'https://example.com/video',
        object_story_spec: { page_id: '999' },
      }),
    ).toThrow(/Use one mode/);
  });

  it('rejects partial simple mode payload', () => {
    expect(() =>
      CreativeCreateSchema.parse({
        name: 'Creative Partial',
        page_id: '123',
        image_hash: 'abc_hash',
      }),
    ).toThrow(/Image mode requires/);
  });

  it('rejects partial simple video mode payload', () => {
    expect(() =>
      CreativeCreateSchema.parse({
        name: 'Creative Partial Video',
        page_id: '123',
        video_id: 'vid_1',
      }),
    ).toThrow(/Video mode requires/);
  });

  it('requires name for update input', () => {
    expect(() => CreativeUpdateSchema.parse({})).toThrow();
  });
});
