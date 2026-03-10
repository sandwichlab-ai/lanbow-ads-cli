import { z } from 'zod';

export const VideoUploadSchema = z.object({
  filePath: z.string().min(1),
  title: z.string().optional(),
  name: z.string().optional(),
});

export type VideoUploadInput = z.infer<typeof VideoUploadSchema>;
