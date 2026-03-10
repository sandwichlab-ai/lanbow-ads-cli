import type {
  AdSetStatus,
  AdStatus,
  BillingEvent,
  BidStrategy,
  CampaignObjective,
  CampaignStatus,
  OptimizationGoal,
} from '../schemas/enums.js';

export interface AdAccount {
  id: string;
  name: string;
  account_id: string;
  account_status: number;
  amount_spent: string;
  balance: string;
  currency: string;
  age: number;
  business_city?: string;
  business_country_code?: string;
  timezone_name: string;
}

export interface Campaign {
  id: string;
  name: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  configured_status: CampaignStatus;
  daily_budget?: string;
  lifetime_budget?: string;
  budget_remaining?: string;
  buying_type: string;
  bid_strategy?: BidStrategy;
  start_time?: string;
  stop_time?: string;
  created_time: string;
  updated_time: string;
  special_ad_categories: string[];
  special_ad_category_country?: string[];
}

export interface AdSet {
  id: string;
  name: string;
  campaign_id: string;
  status: AdSetStatus;
  daily_budget?: string;
  lifetime_budget?: string;
  targeting?: Record<string, unknown>;
  bid_amount?: number;
  bid_strategy?: BidStrategy;
  bid_constraints?: Record<string, number>;
  optimization_goal: OptimizationGoal;
  billing_event: BillingEvent;
  start_time?: string;
  end_time?: string;
  created_time: string;
  updated_time: string;
  is_dynamic_creative?: boolean;
  frequency_control_specs?: Array<{
    event: string;
    interval_days: number;
    max_frequency: number;
  }>;
}

export interface Ad {
  id: string;
  name: string;
  adset_id: string;
  campaign_id: string;
  status: AdStatus;
  creative?: { id: string };
  created_time: string;
  updated_time: string;
  bid_amount?: number;
  conversion_domain?: string;
  tracking_specs?: Array<Record<string, string[]>>;
  preview_shareable_link?: string;
}

export interface AdCreative {
  id: string;
  name?: string;
  status?: string;
  object_story_spec?: {
    page_id?: string;
    link_data?: {
      image_hash?: string;
      link?: string;
      message?: string;
      name?: string;
      description?: string;
      call_to_action?: { type: string; value?: Record<string, unknown> };
    };
    video_data?: Record<string, unknown>;
  };
  asset_feed_spec?: {
    images?: Array<{ hash?: string; url?: string }>;
    videos?: Array<{ video_id?: string; thumbnail_hash?: string }>;
    bodies?: Array<{ text: string }>;
    titles?: Array<{ text: string }>;
    descriptions?: Array<{ text: string }>;
    ad_formats?: string[];
    call_to_action_types?: string[];
    link_urls?: Array<{ website_url: string }>;
  };
  thumbnail_url?: string;
  image_url?: string;
  image_hash?: string;
  url_tags?: string;
  link_url?: string;
  effective_object_story_id?: string;
}

export interface AdImage {
  hash: string;
  url?: string;
  name?: string;
  width?: number;
  height?: number;
}

export interface AdVideo {
  id: string;
  title?: string;
  name?: string;
  length?: number;
  created_time?: string;
  updated_time?: string;
  status?: {
    video_status: string;
  };
  thumbnails?: {
    data: Array<{
      uri: string;
      width: number;
      height: number;
    }>;
  };
}

export interface Page {
  id: string;
  name: string;
  category?: string;
  fan_count?: number;
  link?: string;
  verification_status?: string;
}

export interface InstagramAccount {
  id: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
}

export interface TargetingInterest {
  id: string;
  name: string;
  audience_size?: number;
  audience_size_lower_bound?: number;
  audience_size_upper_bound?: number;
  path?: string[];
  description?: string;
  topic?: string;
}

export interface TargetingLocation {
  key: string;
  name: string;
  type: string;
  region?: string;
  region_id?: number;
  country_code?: string;
  country_name?: string;
  supports_region?: boolean;
  supports_city?: boolean;
}

export interface TargetingCategory {
  id: string;
  name: string;
  audience_size_lower_bound?: number;
  audience_size_upper_bound?: number;
  path?: string[];
  description?: string;
}

export interface AudienceEstimate {
  users_lower_bound: number;
  users_upper_bound: number;
  estimate_ready: boolean;
}

export interface InsightsAction {
  action_type: string;
  value: string;
}

export interface InsightsRow {
  account_id?: string;
  account_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  impressions?: string;
  clicks?: string;
  spend?: string;
  cpc?: string;
  cpm?: string;
  ctr?: string;
  reach?: string;
  frequency?: string;
  actions?: InsightsAction[];
  action_values?: InsightsAction[];
  conversions?: InsightsAction[];
  unique_clicks?: string;
  cost_per_action_type?: InsightsAction[];
  date_start?: string;
  date_stop?: string;
  [key: string]: unknown;
}
