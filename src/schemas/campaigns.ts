import { z } from 'zod';

import { BidStrategySchema, CampaignObjectiveSchema, CampaignStatusSchema } from './enums.js';

export const CampaignCreateSchema = z
  .object({
    name: z.string().min(1).max(400),
    objective: CampaignObjectiveSchema,
    status: CampaignStatusSchema.default('PAUSED'),
    special_ad_categories: z.array(z.string()).default([]),
    special_ad_category_country: z.array(z.string()).optional(),
    daily_budget: z.number().int().positive().optional(),
    lifetime_budget: z.number().int().positive().optional(),
    bid_strategy: BidStrategySchema.optional(),
    bid_cap: z.number().int().positive().optional(),
    bid_constraints: z.record(z.number()).optional(),
    use_adset_level_budgets: z.boolean().optional(),
  })
  .refine((d) => !(d.daily_budget && d.lifetime_budget), {
    message: 'Cannot set both daily_budget and lifetime_budget',
  })
  .refine(
    (d) => {
      if (d.bid_strategy === 'LOWEST_COST_WITH_BID_CAP' || d.bid_strategy === 'COST_CAP') {
        return d.bid_cap != null;
      }
      return true;
    },
    { message: 'bid_cap required for BID_CAP and COST_CAP strategies' },
  )
  .refine(
    (d) => {
      if (d.bid_strategy === 'LOWEST_COST_WITH_MIN_ROAS') {
        return d.bid_constraints?.roas_average_floor != null;
      }
      return true;
    },
    { message: 'bid_constraints.roas_average_floor required for MIN_ROAS' },
  );

export type CampaignCreateInput = z.infer<typeof CampaignCreateSchema>;

export const CampaignUpdateSchema = z.object({
  name: z.string().min(1).max(400).optional(),
  status: CampaignStatusSchema.optional(),
  daily_budget: z.number().int().positive().optional(),
  lifetime_budget: z.number().int().positive().optional(),
  bid_strategy: BidStrategySchema.optional(),
  bid_cap: z.number().int().positive().optional(),
  bid_constraints: z.record(z.number()).optional(),
});

export type CampaignUpdateInput = z.infer<typeof CampaignUpdateSchema>;
