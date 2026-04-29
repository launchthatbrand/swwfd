import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { decryptToken } from "./crypto";

export interface OutlookConnection {
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

const STORE_PATH = join(process.cwd(), ".cache", "swwfd-outlook-connections.json");
let writeQueue: Promise<void> = Promise.resolve();

const connectionKey = (args: {
  mondayAccountId: string;
  mondayUserId: string;
  mondayAppClientId?: string;
}) => `${args.mondayAccountId}:${args.mondayUserId}:${args.mondayAppClientId ?? "*"}`;

const readStore = async (): Promise<Record<string, OutlookConnection>> => {
  try {
    const content = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(content) as Record<string, OutlookConnection>;
    return parsed ?? {};
  } catch {
    return {};
  }
};

const writeStore = async (store: Record<string, OutlookConnection>) => {
  await mkdir(dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
};

const mutateStore = async (
  mutate: (store: Record<string, OutlookConnection>) => void,
) => {
  writeQueue = writeQueue.then(async () => {
    const store = await readStore();
    mutate(store);
    await writeStore(store);
  });
  await writeQueue;
};

export const getOutlookConnection = async (args: {
  mondayAccountId: string;
  mondayUserId: string;
  mondayAppClientId?: string;
}) => {
  const store = await readStore();
  const exact = store[connectionKey(args)];
  if (exact) return exact;
  const fallback = store[
    connectionKey({
      mondayAccountId: args.mondayAccountId,
      mondayUserId: args.mondayUserId,
    })
  ];
  return fallback ?? null;
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
  const now = Date.now();
  const key = connectionKey(args);
  await mutateStore((store) => {
    const existing = store[key];
    store[key] = {
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
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
  });
  return key;
};

export const removeOutlookConnection = async (args: {
  mondayAccountId: string;
  mondayUserId: string;
  mondayAppClientId?: string;
}) => {
  await mutateStore((store) => {
    const exactKey = connectionKey(args);
    delete store[exactKey];
    if (!args.mondayAppClientId) return;
    const fallbackKey = connectionKey({
      mondayAccountId: args.mondayAccountId,
      mondayUserId: args.mondayUserId,
    });
    delete store[fallbackKey];
  });
};

export const getDecryptedRefreshToken = (connection: OutlookConnection) => {
  return decryptToken(connection.encryptedRefreshToken);
};
