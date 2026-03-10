export const ACCOUNT_FIELDS = [
  'id',
  'name',
  'account_id',
  'account_status',
  'amount_spent',
  'balance',
  'currency',
  'age',
  'business_city',
  'business_country_code',
  'timezone_name',
] as const;

export const CAMPAIGN_FIELDS = [
  'id',
  'name',
  'objective',
  'status',
  'daily_budget',
  'lifetime_budget',
  'buying_type',
  'start_time',
  'stop_time',
  'created_time',
  'updated_time',
  'bid_strategy',
  'special_ad_categories',
  'special_ad_category_country',
  'budget_remaining',
  'configured_status',
] as const;

export const ADSET_FIELDS = [
  'id',
  'name',
  'campaign_id',
  'status',
  'daily_budget',
  'lifetime_budget',
  'targeting',
  'bid_amount',
  'bid_strategy',
  'bid_constraints',
  'optimization_goal',
  'billing_event',
  'start_time',
  'end_time',
  'created_time',
  'updated_time',
  'is_dynamic_creative',
  'frequency_control_specs{event,interval_days,max_frequency}',
] as const;

export const AD_FIELDS = [
  'id',
  'name',
  'adset_id',
  'campaign_id',
  'status',
  'creative',
  'created_time',
  'updated_time',
  'bid_amount',
  'conversion_domain',
  'tracking_specs',
  'preview_shareable_link',
] as const;

export const INSIGHTS_FIELDS = [
  'account_id',
  'account_name',
  'campaign_id',
  'campaign_name',
  'adset_id',
  'adset_name',
  'ad_id',
  'ad_name',
  'impressions',
  'clicks',
  'spend',
  'cpc',
  'cpm',
  'ctr',
  'reach',
  'frequency',
  'actions',
  'action_values',
  'conversions',
  'unique_clicks',
  'cost_per_action_type',
] as const;

export const CREATIVE_FIELDS = [
  'id',
  'name',
  'status',
  'thumbnail_url',
  'image_url',
  'image_hash',
  'object_story_spec',
  'asset_feed_spec{images,videos,bodies,titles,descriptions,ad_formats,call_to_action_types,link_urls}',
  'url_tags',
  'link_url',
  'effective_object_story_id',
] as const;

export const CREATIVE_LIST_FIELDS = [
  'id',
  'name',
  'status',
  'thumbnail_url',
] as const;

export const PAGE_FIELDS = [
  'id',
  'name',
  'category',
  'fan_count',
  'link',
  'verification_status',
] as const;

export const INSTAGRAM_ACCOUNT_FIELDS = [
  'id',
  'username',
  'name',
  'profile_picture_url',
  'followers_count',
] as const;

export const DSA_COUNTRIES = [
  'DE',
  'FR',
  'IT',
  'ES',
  'NL',
  'BE',
  'AT',
  'IE',
  'DK',
  'SE',
  'FI',
  'NO',
] as const;
