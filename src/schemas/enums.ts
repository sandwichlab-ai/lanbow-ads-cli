import { z } from 'zod';

export const CampaignObjectiveSchema = z.enum([
  'OUTCOME_AWARENESS',
  'OUTCOME_TRAFFIC',
  'OUTCOME_ENGAGEMENT',
  'OUTCOME_LEADS',
  'OUTCOME_SALES',
  'OUTCOME_APP_PROMOTION',
]);
export type CampaignObjective = z.infer<typeof CampaignObjectiveSchema>;

export const CampaignStatusSchema = z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED']);
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;

export const BidStrategySchema = z.enum([
  'LOWEST_COST_WITHOUT_CAP',
  'LOWEST_COST_WITH_BID_CAP',
  'COST_CAP',
  'LOWEST_COST_WITH_MIN_ROAS',
]);
export type BidStrategy = z.infer<typeof BidStrategySchema>;

export const AdSetStatusSchema = z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED']);
export type AdSetStatus = z.infer<typeof AdSetStatusSchema>;

export const OptimizationGoalSchema = z.enum([
  'LINK_CLICKS',
  'REACH',
  'CONVERSIONS',
  'APP_INSTALLS',
  'VALUE',
  'LEAD_GENERATION',
  'IMPRESSIONS',
  'LANDING_PAGE_VIEWS',
  'OFFSITE_CONVERSIONS',
  'QUALITY_LEAD',
]);
export type OptimizationGoal = z.infer<typeof OptimizationGoalSchema>;

export const BillingEventSchema = z.enum([
  'IMPRESSIONS',
  'LINK_CLICKS',
  'OFFER_CLAIMS',
  'PAGE_LIKES',
  'POST_ENGAGEMENT',
]);
export type BillingEvent = z.infer<typeof BillingEventSchema>;

export const DestinationTypeSchema = z.enum([
  'WEBSITE',
  'WHATSAPP',
  'MESSENGER',
  'INSTAGRAM_DIRECT',
  'ON_AD',
  'APP',
  'FACEBOOK',
  'SHOP_AUTOMATIC',
  'MESSAGING_MESSENGER_WHATSAPP',
]);
export type DestinationType = z.infer<typeof DestinationTypeSchema>;

export const AdStatusSchema = z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED']);
export type AdStatus = z.infer<typeof AdStatusSchema>;

export const DatePresetSchema = z.enum([
  'today',
  'yesterday',
  'this_month',
  'last_month',
  'this_quarter',
  'last_quarter',
  'this_year',
  'last_year',
  'maximum',
  'data_maximum',
  'last_3d',
  'last_7d',
  'last_14d',
  'last_28d',
  'last_30d',
  'last_90d',
  'last_week_mon_sun',
  'last_week_sun_sat',
  'this_week_mon_today',
  'this_week_sun_today',
]);
export type DatePreset = z.infer<typeof DatePresetSchema>;

export const BreakdownDimensionSchema = z.enum([
  'age',
  'gender',
  'country',
  'region',
  'dma',
  'device_platform',
  'platform_position',
  'publisher_platform',
  'impression_device',
  'hourly_stats_aggregated_by_advertiser_time_zone',
  'frequency_value',
]);
export type BreakdownDimension = z.infer<typeof BreakdownDimensionSchema>;

export const InsightsLevelSchema = z.enum(['account', 'campaign', 'adset', 'ad']);
export type InsightsLevel = z.infer<typeof InsightsLevelSchema>;
