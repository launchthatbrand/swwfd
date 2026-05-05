import "server-only";

import { api } from "@convex-config/_generated/api";
import type { Doc, Id } from "@convex-config/_generated/dataModel";
import { getConvexHttpClient } from "~/server/convexHttp";
import { decryptToken } from "./crypto";
const isOutlookDebugLoggingEnabled = process.env.NODE_ENV !== "production";

export interface OutlookConnection {
  id: Id<"outlookConnections">;
  mondayAccountId: string;
  mondayUserId: string;
  mondayAppClientId?: string;
  email?: string;
  displayName?: string;
  tenantId: string;
  clientId: string;
  encryptedAccessToken?: string;
  encryptedRefreshToken: string;
  accessTokenExpiresAt: number;
  scopes: string[];
  createdAt: number;
  updatedAt: number;
}

const connectionKey = (args: {
  mondayAccountId: string;
  mondayUserId: string;
  mondayAppClientId?: string;
}) => `${args.mondayAccountId}:${args.mondayUserId}:${args.mondayAppClientId ?? "*"}`;

type ConvexOutlookConnection = Doc<"outlookConnections">;

const toOutlookConnection = (record: ConvexOutlookConnection): OutlookConnection => {
  return {
    id: record._id,
    mondayAccountId: record.mondayAccountId,
    mondayUserId: record.mondayUserId,
    mondayAppClientId: record.mondayAppClientId ?? undefined,
    email: record.email ?? undefined,
    displayName: record.displayName ?? undefined,
    tenantId: record.tenantId,
    clientId: record.clientId,
    encryptedAccessToken: record.encryptedAccessToken ?? undefined,
    encryptedRefreshToken: record.encryptedRefreshToken,
    accessTokenExpiresAt: record.accessTokenExpiresAt,
    scopes: record.scopes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
};

const getConvexConnectionStore = () => getConvexHttpClient();

export const getOutlookConnection = async (args: {
  mondayAccountId: string;
  mondayUserId: string;
  mondayAppClientId?: string;
}) => {
  if (isOutlookDebugLoggingEnabled) {
    console.info("[OutlookOAuth][store][debug] get connection", {
      mondayAccountId: args.mondayAccountId,
      mondayUserId: args.mondayUserId,
      mondayAppClientId: args.mondayAppClientId ?? null,
      connectionKey: connectionKey(args),
    });
  }
  const convex = getConvexConnectionStore();
  const connection: ConvexOutlookConnection | null = await convex.query(
    api.outlookConnections.getByMondayIdentity,
    {
      mondayAccountId: args.mondayAccountId,
      mondayUserId: args.mondayUserId,
      mondayAppClientId: args.mondayAppClientId,
    },
  );
  if (isOutlookDebugLoggingEnabled) {
    console.info("[OutlookOAuth][store][debug] get connection result", {
      found: !!connection,
      mondayAccountId: args.mondayAccountId,
      mondayUserId: args.mondayUserId,
      mondayAppClientId: args.mondayAppClientId ?? null,
      email: connection?.email ?? null,
      updatedAt: connection?.updatedAt ?? null,
    });
  }
  return connection ? toOutlookConnection(connection) : null;
};

export const upsertOutlookConnection = async (args: {
  mondayAccountId: string;
  mondayUserId: string;
  mondayAppClientId?: string;
  email?: string;
  displayName?: string;
  tenantId: string;
  clientId: string;
  encryptedAccessToken?: string;
  encryptedRefreshToken: string;
  accessTokenExpiresAt: number;
  scopes: string[];
}) => {
  if (isOutlookDebugLoggingEnabled) {
    console.info("[OutlookOAuth][store][debug] upsert connection", {
      mondayAccountId: args.mondayAccountId,
      mondayUserId: args.mondayUserId,
      mondayAppClientId: args.mondayAppClientId ?? null,
      email: args.email ?? null,
      hasAccessToken: !!args.encryptedAccessToken,
      hasRefreshToken: !!args.encryptedRefreshToken,
      scopesCount: args.scopes.length,
      accessTokenExpiresAt: args.accessTokenExpiresAt,
    });
  }
  const convex = getConvexConnectionStore();
  await convex.mutation(api.outlookConnections.upsertByMondayIdentity, {
    mondayAccountId: args.mondayAccountId,
    mondayUserId: args.mondayUserId,
    mondayAppClientId: args.mondayAppClientId,
    email: args.email,
    displayName: args.displayName,
    tenantId: args.tenantId,
    clientId: args.clientId,
    encryptedAccessToken: args.encryptedAccessToken,
    encryptedRefreshToken: args.encryptedRefreshToken,
    accessTokenExpiresAt: args.accessTokenExpiresAt,
    scopes: args.scopes,
  });
  if (isOutlookDebugLoggingEnabled) {
    console.info("[OutlookOAuth][store][debug] upsert complete", {
      connectionKey: connectionKey(args),
    });
  }
  return connectionKey(args);
};

export const removeOutlookConnection = async (args: {
  mondayAccountId: string;
  mondayUserId: string;
  mondayAppClientId?: string;
}) => {
  if (isOutlookDebugLoggingEnabled) {
    console.info("[OutlookOAuth][store][debug] remove connection", {
      mondayAccountId: args.mondayAccountId,
      mondayUserId: args.mondayUserId,
      mondayAppClientId: args.mondayAppClientId ?? null,
      connectionKey: connectionKey(args),
    });
  }
  const convex = getConvexConnectionStore();
  await convex.mutation(api.outlookConnections.removeByMondayIdentity, {
    mondayAccountId: args.mondayAccountId,
    mondayUserId: args.mondayUserId,
    mondayAppClientId: args.mondayAppClientId,
  });
};

export const getDecryptedRefreshToken = (connection: OutlookConnection) => {
  return decryptToken(connection.encryptedRefreshToken);
};
