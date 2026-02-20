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
