import { describe, expect, it } from 'vitest';

import { ImageUploadSchema } from '../../src/schemas/images.js';

describe('Image schemas', () => {
  it('requires bytes', () => {
    expect(() => ImageUploadSchema.parse({})).toThrow();
  });

  it('rejects empty bytes', () => {
    expect(() => ImageUploadSchema.parse({ bytes: '' })).toThrow();
  });

  it('accepts bytes with optional name', () => {
    const parsed = ImageUploadSchema.parse({
      bytes: 'Zm9vYmFy',
      name: 'banner.jpg',
    });

    expect(parsed.bytes).toBe('Zm9vYmFy');
    expect(parsed.name).toBe('banner.jpg');
  });
});
