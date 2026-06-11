import { createEnv } from "@t3-oss/env-nextjs";
import { vercel } from "@t3-oss/env-nextjs/presets-zod";
import { z } from "zod/v4";

export const env = createEnv({
  extends: [vercel()],
  shared: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  },
  server: {
    // DEV-only convenience for browser automation and local tooling.
    SWWFD_DEV_AUTH_BYPASS_ENABLED: z
      .enum(["true", "false"])
      .optional()
      .default("false"),
    SWWFD_DEV_AUTH_BYPASS_EMAIL: z.string().email().optional(),
    SWWFD_DEV_AUTH_BYPASS_PASSWORD: z.string().min(8).optional(),
    MONDAY_SIGNING_SECRET: z.string().min(1).optional(),
    MONDAY_API_KEY: z.string().optional(),
    MONDAY_BOARD_ID: z.string().optional(),
    MONDAY_JOBS_BOARD_ID: z.string().optional(),
    MONDAY_ROUTING_COUNTY_BOARD_ID: z.string().optional(),
    MONDAY_ROUTING_DISTRICT_BOARD_ID: z.string().optional(),
    MONDAY_ROUTING_COUNTY_NAME_COLUMN_ID: z.string().optional(),
    MONDAY_ROUTING_COUNTY_DISTRICT_COLUMN_ID: z.string().optional(),
    MONDAY_ROUTING_COUNTY_ACTIVE_COLUMN_ID: z.string().optional(),
    MONDAY_ROUTING_DISTRICT_CODE_COLUMN_ID: z.string().optional(),
    MONDAY_ROUTING_DISTRICT_OWNER_COLUMN_ID: z.string().optional(),
    MONDAY_ROUTING_DISTRICT_ACTIVE_COLUMN_ID: z.string().optional(),
    MONDAY_EMAIL_TEMPLATES_BOARD_ID: z.string().optional(),
    MONDAY_CONTACT_TOUCHED_BOARD_ID: z.string().optional(),
    MONDAY_HELPDESK_BOARD_ID: z.string().optional(),
    OUTLOOK_OAUTH_CLIENT_ID: z.string().min(1).optional(),
    OUTLOOK_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
    OUTLOOK_OAUTH_TENANT_ID: z.string().min(1).optional(),
    OUTLOOK_OAUTH_STATE_SECRET: z.string().min(1).optional(),
    OUTLOOK_TOKEN_ENCRYPTION_KEY: z.string().min(1).optional(),
    OUTLOOK_OAUTH_REDIRECT_URI: z.url().optional(),
    OUTLOOK_REPLY_TO_EMAIL: z.string().email().optional(),
    OUTLOOK_SUBSCRIPTION_RENEW_SECRET: z.string().min(1).optional(),
    OUTLOOK_INBOUND_MIRROR_ENABLED: z
      .enum(["true", "false"])
      .optional()
      .default("true"),
    OUTLOOK_INBOUND_SENDER_FALLBACK_ENABLED: z
      .enum(["true", "false"])
      .optional()
      .default("false"),
    ZOHO_OAUTH_CLIENT_ID: z.string().min(1).optional(),
    ZOHO_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
    ZOHO_OAUTH_STATE_SECRET: z.string().min(1).optional(),
    ZOHO_OAUTH_REDIRECT_URI: z.url().optional(),
    ZOHO_OAUTH_ACCOUNTS_BASE_URL: z.url().optional(),
    ZOHO_OAUTH_SCOPES: z.string().min(1).optional(),
    ZOHO_CAMPAIGNS_API_BASE_URL: z.url().optional(),
    ZOHO_CAMPAIGNS_SEND_PATH: z.string().min(1).optional(),
    ZOHO_CAMPAIGNS_DEFAULT_SENDER_EMAIL: z.string().email().optional(),
    ZOHO_CAMPAIGNS_DEFAULT_SENDER_NAME: z.string().optional(),
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_FROM_PHONE: z.string().optional(),
  },

  client: {
    NEXT_PUBLIC_CONVEX_URL: z.url(),
    // Used only for metadataBase and canonical URLs.
    NEXT_PUBLIC_APP_URL: z.url().optional(),
  },
  experimental__runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
