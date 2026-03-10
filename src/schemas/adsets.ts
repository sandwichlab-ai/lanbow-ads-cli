import { z } from 'zod';

import {
  AdSetStatusSchema,
  BidStrategySchema,
  BillingEventSchema,
  DestinationTypeSchema,
  OptimizationGoalSchema,
} from './enums.js';

const FrequencyControlSpecSchema = z.object({
  event: z.literal('IMPRESSIONS'),
  interval_days: z.number().int().positive(),
  max_frequency: z.number().int().positive(),
});

const TargetingSpecSchema = z
  .object({
    age_min: z.number().int().min(13).max(65).optional(),
    age_max: z.number().int().min(13).max(65).optional(),
    genders: z.array(z.number().int().min(0).max(2)).optional(),
    geo_locations: z
      .object({
        countries: z.array(z.string().length(2)).optional(),
      })
      .passthrough()
      .optional(),
    targeting_automation: z
      .object({
        advantage_audience: z.union([z.literal(0), z.literal(1)]),
      })
      .optional(),
  })
  .passthrough();

export const AdSetCreateSchema = z
  .object({
    campaign_id: z.string().min(1),
    name: z.string().min(1).max(400),
    optimization_goal: OptimizationGoalSchema,
    billing_event: BillingEventSchema,
    status: AdSetStatusSchema.default('PAUSED'),
    daily_budget: z.number().int().positive().optional(),
    lifetime_budget: z.number().int().positive().optional(),
    bid_amount: z.number().int().positive().optional(),
    bid_strategy: BidStrategySchema.optional(),
    bid_constraints: z.record(z.number()).optional(),
    targeting: TargetingSpecSchema.optional(),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    destination_type: DestinationTypeSchema.optional(),
    promoted_object: z.record(z.string()).optional(),
    is_dynamic_creative: z.boolean().optional(),
    frequency_control_specs: z.array(FrequencyControlSpecSchema).optional(),
  })
  .refine((d) => !(d.daily_budget && d.lifetime_budget), {
    message: 'Cannot set both daily_budget and lifetime_budget',
  })
  .refine(
    (d) => {
      if (d.bid_strategy === 'LOWEST_COST_WITH_BID_CAP' || d.bid_strategy === 'COST_CAP') {
        return d.bid_amount != null;
      }
      return true;
    },
    { message: 'bid_amount required for BID_CAP and COST_CAP strategies' },
  )
  .refine(
    (d) => {
      if (d.bid_strategy === 'LOWEST_COST_WITH_MIN_ROAS') {
        return d.bid_constraints?.roas_average_floor != null;
      }
      return true;
    },
    {
      message: 'bid_constraints.roas_average_floor required for MIN_ROAS (value = target × 10000)',
    },
  )
  .refine(
    (d) => {
      if (d.optimization_goal === 'APP_INSTALLS') {
        return d.promoted_object?.application_id != null && d.promoted_object?.object_store_url != null;
      }
      return true;
    },
    { message: 'promoted_object.application_id + object_store_url required for APP_INSTALLS' },
  );

export type AdSetCreateInput = z.infer<typeof AdSetCreateSchema>;

export const AdSetUpdateSchema = z.object({
  name: z.string().min(1).max(400).optional(),
  status: AdSetStatusSchema.optional(),
  daily_budget: z.number().int().positive().optional(),
  lifetime_budget: z.number().int().positive().optional(),
  bid_amount: z.number().int().positive().optional(),
  bid_strategy: BidStrategySchema.optional(),
  bid_constraints: z.record(z.number()).optional(),
  targeting: TargetingSpecSchema.optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  frequency_control_specs: z.array(FrequencyControlSpecSchema).optional(),
});

export type AdSetUpdateInput = z.infer<typeof AdSetUpdateSchema>;
