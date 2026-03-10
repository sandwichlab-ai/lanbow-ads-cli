import { z } from 'zod';

const AccountAliasSchema = z.object({
  account_id: z.string().regex(/^act_\d+$/),
  label: z.string().optional(),
});

export const AppConfigSchema = z
  .object({
    meta_app_id: z.string().optional(),
    meta_app_secret: z.string().optional(),
    meta_access_token: z.string().optional(),
    default_account_id: z.string().optional(),
    default_account_alias: z.string().optional(),
    meta_ads_disable_callback_server: z.boolean().optional(),
    meta_ads_disable_login_link: z.boolean().optional(),
    accounts: z.record(AccountAliasSchema).optional(),
  })
  .passthrough();
