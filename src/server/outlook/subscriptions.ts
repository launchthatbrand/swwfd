import "server-only";

import { randomUUID } from "node:crypto";
import { api as apiGenerated } from "@convex-config/_generated/api";
import { env } from "~/env";
import { getConvexHttpClient } from "~/server/convexHttp";
import {
  createMessageSubscription,
  deleteMessageSubscription,
  getDefaultSubscriptionExpirationIso,
  renewMessageSubscription,
} from "./graph";
import type { OutlookConnection } from "./store";

const FALLBACK_WEBHOOK_PATH = "/api/monday/email/outlook/webhook";

const toTimestamp = (isoValue: string) => {
  const parsed = Date.parse(isoValue);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid ISO timestamp: ${isoValue}`);
  }
  return parsed;
};

const normalizeOrigin = (origin: string) => origin.replace(/\/+$/, "");

export const resolveAppOrigin = (requestOrigin?: string) => {
  const explicitAppUrl = env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicitAppUrl) {
    return normalizeOrigin(explicitAppUrl);
  }
  const redirectUri = env.OUTLOOK_OAUTH_REDIRECT_URI?.trim();
  if (redirectUri) {
    try {
      return normalizeOrigin(new URL(redirectUri).origin);
    } catch {
      // ignore malformed values and fall back.
    }
  }
  if (requestOrigin?.trim()) {
    return normalizeOrigin(requestOrigin);
  }
  throw new Error(
    "Unable to resolve app origin for Outlook subscriptions. Set NEXT_PUBLIC_APP_URL.",
  );
};

const buildNotificationUrl = (appOrigin: string) => {
  return `${normalizeOrigin(appOrigin)}${FALLBACK_WEBHOOK_PATH}`;
};

export const createAndStoreOutlookSubscription = async (args: {
  connection: OutlookConnection;
  accessToken: string;
  requestOrigin?: string;
}) => {
  const appOrigin = resolveAppOrigin(args.requestOrigin);
  const notificationUrl = buildNotificationUrl(appOrigin);
  const clientState = randomUUID();
  const expirationDateTime = getDefaultSubscriptionExpirationIso(24);

  const created = await createMessageSubscription({
    accessToken: args.accessToken,
    notificationUrl,
    clientState,
    expirationDateTime,
  });

  const convex = getConvexHttpClient();
  await convex.mutation(apiGenerated.outlookInbound.upsertGraphSubscription, {
    mondayAccountId: args.connection.mondayAccountId,
    mondayUserId: args.connection.mondayUserId,
    mondayAppClientId: args.connection.mondayAppClientId,
    connectionEmail: args.connection.email,
    subscriptionId: created.id,
    clientState,
    resource: created.resource,
    changeType: created.changeType,
    notificationUrl,
    expirationDateTime: created.expirationDateTime,
    expirationTimestamp: toTimestamp(created.expirationDateTime),
    status: "active",
  });

  return {
    subscriptionId: created.id,
    notificationUrl,
    expirationDateTime: created.expirationDateTime,
    expirationTimestamp: toTimestamp(created.expirationDateTime),
    clientState,
  };
};

export const renewAndStoreOutlookSubscription = async (args: {
  accessToken: string;
  subscriptionId: string;
}) => {
  const expirationDateTime = getDefaultSubscriptionExpirationIso(24);
  const renewed = await renewMessageSubscription({
    accessToken: args.accessToken,
    subscriptionId: args.subscriptionId,
    expirationDateTime,
  });

  const convex = getConvexHttpClient();
  await convex.mutation(apiGenerated.outlookInbound.markGraphSubscriptionStatus, {
    subscriptionId: args.subscriptionId,
    status: "active",
    expirationDateTime: renewed.expirationDateTime,
    expirationTimestamp: toTimestamp(renewed.expirationDateTime),
  });
  return renewed;
};

export const deleteAndMarkOutlookSubscription = async (args: {
  accessToken: string;
  subscriptionId: string;
}) => {
  await deleteMessageSubscription({
    accessToken: args.accessToken,
    subscriptionId: args.subscriptionId,
  });
  const convex = getConvexHttpClient();
  await convex.mutation(apiGenerated.outlookInbound.markGraphSubscriptionStatus, {
    subscriptionId: args.subscriptionId,
    status: "deleted",
  });
};
