import { NextResponse } from "next/server";
import { api as apiGenerated } from "@convex-config/_generated/api";
import { getConvexHttpClient } from "~/server/convexHttp";
import { getRequestOrigin } from "~/server/http/requestOrigin";
import { requireVerifiedMondaySession } from "~/server/monday/session";
import { refreshOutlookAccessToken } from "~/server/outlook/graph";
import { deleteAndMarkOutlookSubscription } from "~/server/outlook/subscriptions";
import { getOutlookConnection, removeOutlookConnection } from "~/server/outlook/store";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

export const POST = async (request: Request) => {
  try {
    const identity = await requireVerifiedMondaySession(request);
    const convex = getConvexHttpClient();
    const existingConnection = await getOutlookConnection({
      mondayAccountId: identity.accountId,
      mondayUserId: identity.userId,
      mondayAppClientId: identity.appClientId,
    });

    if (existingConnection) {
      try {
        const refreshed = await refreshOutlookAccessToken({
          connection: existingConnection,
          requestOrigin: getRequestOrigin(request),
        });
        const subscriptions = await convex.query(
          apiGenerated.outlookInbound.listGraphSubscriptionsByIdentity,
          {
            mondayAccountId: identity.accountId,
            mondayUserId: identity.userId,
            mondayAppClientId: identity.appClientId,
          },
        );
        for (const subscription of subscriptions) {
          if (subscription.status === "deleted") continue;
          try {
            await deleteAndMarkOutlookSubscription({
              accessToken: refreshed.accessToken,
              subscriptionId: subscription.subscriptionId,
            });
          } catch (subscriptionDeleteError) {
            await convex.mutation(
              apiGenerated.outlookInbound.markGraphSubscriptionStatus,
              {
                subscriptionId: subscription.subscriptionId,
                status: "error",
                lastError:
                  subscriptionDeleteError instanceof Error
                    ? subscriptionDeleteError.message
                    : String(subscriptionDeleteError),
              },
            );
          }
        }
      } catch (disconnectSubError) {
        console.warn("[OutlookOAuth][disconnect] subscription cleanup failed", {
          message:
            disconnectSubError instanceof Error
              ? disconnectSubError.message
              : String(disconnectSubError),
        });
      }
    }

    await removeOutlookConnection({
      mondayAccountId: identity.accountId,
      mondayUserId: identity.userId,
      mondayAppClientId: identity.appClientId,
    });
    await convex.mutation(
      apiGenerated.outlookInbound.removeGraphSubscriptionsByIdentity,
      {
        mondayAccountId: identity.accountId,
        mondayUserId: identity.userId,
        mondayAppClientId: identity.appClientId,
      },
    );
    return toJson({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return toJson({ ok: false, error: message }, 401);
  }
};
