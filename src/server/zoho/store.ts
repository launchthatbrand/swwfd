import "server-only";

import { api } from "@convex-config/_generated/api";
import type { Doc, Id } from "@convex-config/_generated/dataModel";
import { decryptToken } from "~/server/outlook/crypto";
import { getConvexHttpClient } from "~/server/convexHttp";

export interface ZohoConnection {
  id: Id<"zohoConnections">;
  mondayAccountId: string;
  mondayAppClientId?: string;
  connectedByMondayUserId: string;
  senderEmail?: string;
  senderName?: string;
  encryptedAccessToken?: string;
  encryptedRefreshToken: string;
  accessTokenExpiresAt: number;
  scopes: string[];
  createdAt: number;
  updatedAt: number;
}

type ConvexZohoConnection = Doc<"zohoConnections">;

const toZohoConnection = (record: ConvexZohoConnection): ZohoConnection => {
  return {
    id: record._id,
    mondayAccountId: record.mondayAccountId,
    mondayAppClientId: record.mondayAppClientId ?? undefined,
    connectedByMondayUserId: record.connectedByMondayUserId,
    senderEmail: record.senderEmail ?? undefined,
    senderName: record.senderName ?? undefined,
    encryptedAccessToken: record.encryptedAccessToken ?? undefined,
    encryptedRefreshToken: record.encryptedRefreshToken,
    accessTokenExpiresAt: record.accessTokenExpiresAt,
    scopes: record.scopes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
};

export const getZohoConnection = async (args: {
  mondayAccountId: string;
  mondayAppClientId?: string;
}) => {
  const convex = getConvexHttpClient();
  const connection = await convex.query(api.zohoConnections.getByMondayAccount, {
    mondayAccountId: args.mondayAccountId,
    mondayAppClientId: args.mondayAppClientId,
  });
  return connection ? toZohoConnection(connection) : null;
};

export const upsertZohoConnection = async (args: {
  mondayAccountId: string;
  mondayAppClientId?: string;
  connectedByMondayUserId: string;
  senderEmail?: string;
  senderName?: string;
  encryptedAccessToken?: string;
  encryptedRefreshToken: string;
  accessTokenExpiresAt: number;
  scopes: string[];
}) => {
  const convex = getConvexHttpClient();
  return await convex.mutation(api.zohoConnections.upsertByMondayAccount, args);
};

export const removeZohoConnection = async (args: {
  mondayAccountId: string;
  mondayAppClientId?: string;
}) => {
  const convex = getConvexHttpClient();
  return await convex.mutation(api.zohoConnections.removeByMondayAccount, args);
};

export const getDecryptedZohoRefreshToken = (connection: ZohoConnection) => {
  return decryptToken(connection.encryptedRefreshToken);
};
