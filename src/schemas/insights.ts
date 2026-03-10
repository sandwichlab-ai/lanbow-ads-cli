import { z } from 'zod';

import { BreakdownDimensionSchema, DatePresetSchema, InsightsLevelSchema } from './enums.js';

export const InsightsParamsSchema = z
  .object({
    level: InsightsLevelSchema.optional(),
    date_preset: DatePresetSchema.optional(),
    time_range: z
      .object({
        since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .optional(),
    breakdowns: z.array(BreakdownDimensionSchema).optional(),
    fields: z.array(z.string()).optional(),
    action_attribution_windows: z
      .array(z.enum(['1d_click', '7d_click', '28d_click', '1d_view', '7d_view', '28d_view']))
      .optional(),
    time_increment: z.union([z.number().int().positive(), z.literal('monthly'), z.literal('all_days')]).optional(),
    filtering: z
      .array(
        z.object({
          field: z.string(),
          operator: z.string(),
          value: z.array(z.string()),
        }),
      )
      .optional(),
    limit: z.number().int().positive().max(100).optional(),
    sort: z.array(z.string()).optional(),
  })
  .refine((d) => !(d.date_preset && d.time_range), {
    message: 'Cannot set both date_preset and time_range',
  });

export type InsightsParams = z.infer<typeof InsightsParamsSchema>;
