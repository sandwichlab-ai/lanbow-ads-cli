import { z } from 'zod';

export const ImageUploadSchema = z.object({
  bytes: z.string().min(1),
  name: z.string().optional(),
});

export type ImageUploadInput = z.infer<typeof ImageUploadSchema>;

