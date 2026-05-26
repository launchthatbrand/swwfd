import { NextResponse } from "next/server";
import { api as apiGenerated } from "@convex-config/_generated/api";
import { env } from "~/env";
import { getConvexHttpClient } from "~/server/convexHttp";
import { getRequestOrigin } from "~/server/http/requestOrigin";
import { refreshOutlookAccessToken } from "~/server/outlook/graph";
import {
  createAndStoreOutlookSubscription,
  renewAndStoreOutlookSubscription,
} from "~/server/outlook/subscriptions";
import { getOutlookConnection } from "~/server/outlook/store";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) =>
  NextResponse.json(body, { status });

const isAuthorizedRenewRequest = (request: Request) => {
  const provided = request.headers.get("x-outlook-renew-secret")?.trim();
  const expected =
    env.OUTLOOK_SUBSCRIPTION_RENEW_SECRET?.trim() ??
    env.MONDAY_SIGNING_SECRET?.trim() ??
    "";
  if (!expected) return false;
  return provided === expected;
};

export const POST = async (request: Request) => {
  if (!isAuthorizedRenewRequest(request)) {
    return toJson({ ok: false, error: "Unauthorized renew request" }, 401);
  }

  const convex = getConvexHttpClient();
  const expiresBefore = Date.now() + 12 * 60 * 60 * 1000;
  const subscriptions = await convex.query(
    apiGenerated.outlookInbound.listExpiringGraphSubscriptions,
    {
      expiresBefore,
      limit: 500,
    },
  );

  if (subscriptions.length === 0) {
    console.info("[OutlookSubscriptionRenew] no subscriptions due for renewal");
    return toJson({ ok: true, renewed: 0, recreated: 0, failed: 0 });
  }
  console.info("[OutlookSubscriptionRenew] starting renewal run", {
    expiringCount: subscriptions.length,
    expiresBefore,
  });

  let renewed = 0;
  let recreated = 0;
  let failed = 0;

  for (const subscription of subscriptions) {
    try {
      const connection = await getOutlookConnection({
        mondayAccountId: subscription.mondayAccountId,
        mondayUserId: subscription.mondayUserId,
        mondayAppClientId: subscription.mondayAppClientId ?? undefined,
      });
      if (!connection) {
        failed += 1;
        await convex.mutation(apiGenerated.outlookInbound.markGraphSubscriptionStatus, {
          subscriptionId: subscription.subscriptionId,
          status: "error",
          lastError: "Missing connection for subscription renewal",
        });
        continue;
      }

      const refreshed = await refreshOutlookAccessToken({
        connection,
        requestOrigin: getRequestOrigin(request),
      });

      try {
        await renewAndStoreOutlookSubscription({
          accessToken: refreshed.accessToken,
          subscriptionId: subscription.subscriptionId,
        });
        renewed += 1;
      } catch (renewError) {
        const message =
          renewError instanceof Error ? renewError.message : String(renewError);
        if (message.includes("(404)")) {
          await convex.mutation(apiGenerated.outlookInbound.markGraphSubscriptionStatus, {
            subscriptionId: subscription.subscriptionId,
            status: "deleted",
            lastError: "Subscription was missing in Graph; recreated",
          });
          await createAndStoreOutlookSubscription({
            connection,
            accessToken: refreshed.accessToken,
            requestOrigin: getRequestOrigin(request),
          });
          recreated += 1;
          continue;
        }
        throw renewError;
      }
    } catch (error) {
      failed += 1;
      console.error("[OutlookSubscriptionRenew] renewal failed", {
        subscriptionId: subscription.subscriptionId,
        error: error instanceof Error ? error.message : String(error),
      });
      await convex.mutation(apiGenerated.outlookInbound.markGraphSubscriptionStatus, {
        subscriptionId: subscription.subscriptionId,
        status: "error",
        lastError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.info("[OutlookSubscriptionRenew] renewal run completed", {
    renewed,
    recreated,
    failed,
  });
  return toJson({ ok: failed === 0, renewed, recreated, failed });
};
