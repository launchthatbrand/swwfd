"use node";

import type { JWTPayload } from "jose";
import { jwtVerify } from "jose";

export interface MondaySessionIdentity {
  userId: string;
  accountId: string;
  boardId?: string;
  appClientId?: string;
  expiresAt?: number;
}

const MONDAY_DEV_BYPASS_TOKEN = "__monday_dev_bypass__";
const MONDAY_API_URL = "https://api.monday.com/v2";

const canUseMondayDevBypass = () => {
  const nodeEnv = process.env.NODE_ENV ?? "";
  const apiKey = process.env.MONDAY_API_KEY?.trim() ?? "";
  return nodeEnv === "development" && apiKey.length > 0;
};

let cachedDevIdentity: MondaySessionIdentity | null = null;

const getMondayDevBypassIdentity =
  async (): Promise<MondaySessionIdentity> => {
    if (!canUseMondayDevBypass()) {
      throw new Error("Monday dev bypass is disabled");
    }
    if (cachedDevIdentity) return cachedDevIdentity;

    const apiKey = process.env.MONDAY_API_KEY ?? "";
    const response = await fetch(MONDAY_API_URL, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `query MondayViewerIdentity { me { id account { id } } }`,
        variables: {},
      }),
    });
    if (!response.ok) {
      throw new Error(
        `Failed loading Monday dev identity (${response.status})`,
      );
    }
    const json = (await response.json()) as {
      data?: {
        me?: {
          id?: string | number | null;
          account?: { id?: string | number | null } | null;
        } | null;
      };
      errors?: Array<{ message?: string }>;
    };
    if (json.errors?.length) {
      throw new Error(
        json.errors
          .map((e) => e.message)
          .filter(Boolean)
          .join(" | ") || "Failed loading Monday dev identity",
      );
    }

    const userId =
      json.data?.me?.id != null ? String(json.data.me.id) : null;
    const accountId =
      json.data?.me?.account?.id != null
        ? String(json.data.me.account.id)
        : null;
    if (!userId || !accountId) {
      throw new Error(
        "Monday dev identity response missing me.id/account.id",
      );
    }

    cachedDevIdentity = { userId, accountId };
    return cachedDevIdentity;
  };

const getSigningSecret = () => {
  const secret = `${process.env.MONDAY_SIGNING_SECRET ?? ""}`;
  if (!secret || secret.trim().length === 0) {
    throw new Error("MONDAY_SIGNING_SECRET is missing");
  }
  return secret;
};

const getCandidateSigningKeys = (secret: string) => {
  const keys: Uint8Array[] = [new TextEncoder().encode(secret)];

  const hex = /^[0-9a-f]+$/i;
  if (hex.test(secret) && secret.length % 2 === 0) {
    const bytes = new Uint8Array(secret.length / 2);
    for (let i = 0; i < secret.length; i += 2) {
      bytes[i / 2] = Number.parseInt(secret.slice(i, i + 2), 16);
    }
    keys.push(bytes);
  }

  try {
    const normalized = secret.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    const decoded = Buffer.from(padded, "base64");
    if (decoded.length > 0) {
      keys.push(new Uint8Array(decoded));
    }
  } catch {
    // Ignore invalid base64 formatting.
  }

  return keys;
};

const readClaimString = (payload: JWTPayload, key: string) => {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
};

const readClaimNumberLikeString = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value))
    return String(value);
  if (typeof value === "string" && value.length > 0) return value;
  return undefined;
};

export const verifyMondaySessionToken = async (
  token: string,
): Promise<MondaySessionIdentity> => {
  const secret = getSigningSecret();
  const keys = getCandidateSigningKeys(secret);
  let payload: JWTPayload | null = null;

  for (const key of keys) {
    try {
      const verified = await jwtVerify<JWTPayload>(token, key, {
        algorithms: ["HS256"],
      });
      payload = verified.payload;
      break;
    } catch {
      // Try the next key derivation.
    }
  }

  if (!payload) {
    throw new Error("signature verification failed");
  }

  const dat =
    typeof payload.dat === "object" && payload.dat !== null
      ? (payload.dat as Record<string, unknown>)
      : null;
  const userId =
    readClaimString(payload, "userId") ??
    readClaimNumberLikeString(dat?.user_id) ??
    readClaimNumberLikeString(dat?.userId);
  const accountId =
    readClaimString(payload, "accountId") ??
    readClaimNumberLikeString(dat?.account_id) ??
    readClaimNumberLikeString(dat?.accountId);
  const boardId =
    readClaimString(payload, "boardId") ??
    readClaimNumberLikeString(dat?.board_id);
  const appClientId =
    readClaimString(payload, "appClientId") ??
    readClaimString(payload, "client_id") ??
    readClaimNumberLikeString(dat?.client_id);

  if (!userId || !accountId) {
    throw new Error("Invalid Monday session token payload");
  }

  return {
    userId,
    accountId,
    boardId,
    appClientId,
    expiresAt: typeof payload.exp === "number" ? payload.exp : undefined,
  };
};

export const resolveMondayIdentity = async (
  token: string,
): Promise<MondaySessionIdentity> => {
  if (!token || token.trim().length === 0) {
    if (canUseMondayDevBypass()) {
      return await getMondayDevBypassIdentity();
    }
    throw new Error("Missing Monday session token");
  }
  if (token === MONDAY_DEV_BYPASS_TOKEN && canUseMondayDevBypass()) {
    return await getMondayDevBypassIdentity();
  }
  return await verifyMondaySessionToken(token);
};
