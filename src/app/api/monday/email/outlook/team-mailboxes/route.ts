import { NextResponse } from "next/server";
import { api as apiGenerated } from "@convex-config/_generated/api";
import { getConvexHttpClient } from "~/server/convexHttp";
import { getMondayUserProfile } from "~/server/monday/client";
import { requireVerifiedMondaySession } from "~/server/monday/session";
import { getOutlookConnection } from "~/server/outlook/store";

export const runtime = "nodejs";

const normalizeUserId = (value: string | null | undefined) => value?.trim() ?? "";

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

export const GET = async (request: Request) => {
  try {
    const identity = await requireVerifiedMondaySession(request);
    const contactOwnerUserId = normalizeUserId(
      new URL(request.url).searchParams.get("contactOwnerUserId"),
    );

    const convex = getConvexHttpClient();
    const platformSettings = await convex.query(
      apiGenerated.mondaySettings.getPlatformSettings,
      {},
    );
    const teamUserIds = Array.from(
      new Set(
        [
          platformSettings.masterAdminUserId,
          ...platformSettings.adminUserIds,
          ...platformSettings.employeeUserIds,
        ]
          .map((entry) => normalizeUserId(entry))
          .filter((entry) => entry.length > 0),
      ),
    );
    if (!teamUserIds.includes(identity.userId)) {
      return toJson(
        {
          ok: false,
          error:
            "You are not authorized to view delegated sender mailboxes for this workspace.",
        },
        403,
      );
    }

    const mailboxes = await Promise.all(
      teamUserIds.map(async (mondayUserId) => {
        const [profile, connection] = await Promise.all([
          getMondayUserProfile(mondayUserId).catch(() => null),
          getOutlookConnection({
            mondayAccountId: identity.accountId,
            mondayUserId,
            mondayAppClientId: identity.appClientId,
          }),
        ]);
        return {
          mondayUserId,
          name: profile?.name ?? null,
          userEmail: profile?.email ?? null,
          connected: !!connection,
          mailboxEmail: connection?.email ?? null,
          mailboxDisplayName: connection?.displayName ?? null,
          accessTokenExpiresAt: connection?.accessTokenExpiresAt ?? null,
          updatedAt: connection?.updatedAt ?? null,
          isCurrentUser: mondayUserId === identity.userId,
          isContactOwner:
            contactOwnerUserId.length > 0 && mondayUserId === contactOwnerUserId,
        };
      }),
    );

    const collator = new Intl.Collator(undefined, { sensitivity: "base" });
    mailboxes.sort((left, right) => {
      if (left.connected !== right.connected) {
        return left.connected ? -1 : 1;
      }
      if (left.isContactOwner !== right.isContactOwner) {
        return left.isContactOwner ? -1 : 1;
      }
      if (left.isCurrentUser !== right.isCurrentUser) {
        return left.isCurrentUser ? -1 : 1;
      }
      const leftLabel =
        left.name?.trim() ||
        left.mailboxDisplayName?.trim() ||
        left.mailboxEmail?.trim() ||
        left.userEmail?.trim() ||
        left.mondayUserId;
      const rightLabel =
        right.name?.trim() ||
        right.mailboxDisplayName?.trim() ||
        right.mailboxEmail?.trim() ||
        right.userEmail?.trim() ||
        right.mondayUserId;
      return collator.compare(leftLabel, rightLabel);
    });

    const defaultSenderUserId =
      mailboxes.find((entry) => entry.isContactOwner && entry.connected)?.mondayUserId ??
      mailboxes.find((entry) => entry.isCurrentUser && entry.connected)?.mondayUserId ??
      mailboxes.find((entry) => entry.connected)?.mondayUserId ??
      mailboxes.find((entry) => entry.isContactOwner)?.mondayUserId ??
      mailboxes.find((entry) => entry.isCurrentUser)?.mondayUserId ??
      mailboxes[0]?.mondayUserId ??
      null;

    return toJson({
      ok: true,
      mailboxes,
      defaultSenderUserId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return toJson({ ok: false, error: message }, 401);
  }
};
