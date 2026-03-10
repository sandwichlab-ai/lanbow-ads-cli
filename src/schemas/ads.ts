import { z } from 'zod';

import { AdStatusSchema } from './enums.js';

const TrackingSpecSchema = z.object({
  'action.type': z.array(z.string()),
  fb_pixel: z.array(z.string()).optional(),
});

export const AdCreateSchema = z.object({
  name: z.string().min(1).max(400),
  adset_id: z.string().min(1),
  status: AdStatusSchema.default('PAUSED'),
  creative_id: z.string().optional(),
  tracking_specs: z.array(TrackingSpecSchema).optional(),
  conversion_domain: z.string().optional(),
  bid_amount: z.number().int().positive().optional(),
});

export type AdCreateInput = z.infer<typeof AdCreateSchema>;

export const AdUpdateSchema = z.object({
  name: z.string().min(1).max(400).optional(),
  status: AdStatusSchema.optional(),
  creative_id: z.string().optional(),
  bid_amount: z.number().int().positive().optional(),
  tracking_specs: z.array(TrackingSpecSchema).optional(),
});

export type AdUpdateInput = z.infer<typeof AdUpdateSchema>;
