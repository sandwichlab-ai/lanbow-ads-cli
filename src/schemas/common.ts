import { z } from 'zod';

export const PaginationSchema = z.object({
  limit: z.number().int().positive().max(100).default(25),
  after: z.string().optional(),
  before: z.string().optional(),
  all: z.boolean().default(false),
});
