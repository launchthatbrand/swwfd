"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";

const normalizeOrigin = (value: string) => value.replace(/\/+$/, "");

const resolveAppOrigin = () => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) return normalizeOrigin(appUrl);

  const redirectUri = process.env.OUTLOOK_OAUTH_REDIRECT_URI?.trim();
  if (redirectUri) {
    try {
      return normalizeOrigin(new URL(redirectUri).origin);
    } catch {
      return null;
    }
  }
  return null;
};

export const renewOutlookSubscriptions = internalAction({
  args: {},
  returns: v.object({
    ok: v.boolean(),
    status: v.number(),
    message: v.string(),
  }),
  handler: async () => {
    const appOrigin = resolveAppOrigin();
    if (!appOrigin) {
      return {
        ok: false,
        status: 500,
        message:
          "Missing NEXT_PUBLIC_APP_URL (or OUTLOOK_OAUTH_REDIRECT_URI) for renewal target",
      };
    }

    const secret =
      process.env.OUTLOOK_SUBSCRIPTION_RENEW_SECRET?.trim() ??
      process.env.MONDAY_SIGNING_SECRET?.trim() ??
      "";
    if (!secret) {
      return {
        ok: false,
        status: 500,
        message:
          "Missing OUTLOOK_SUBSCRIPTION_RENEW_SECRET (or MONDAY_SIGNING_SECRET fallback)",
      };
    }

    const endpoint = `${appOrigin}/api/monday/email/outlook/subscriptions/renew`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "x-outlook-renew-secret": secret,
      },
      cache: "no-store",
    });
    const raw = await response.text();
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: raw || "Renew endpoint failed",
      };
    }
    return {
      ok: true,
      status: response.status,
      message: raw || "Renew endpoint completed",
    };
  },
});
