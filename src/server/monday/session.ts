import "server-only";

import type { JWTPayload } from "jose";
import { jwtVerify } from "jose";
import { env } from "~/env";

export interface MondaySessionIdentity {
  userId: string;
  accountId: string;
  boardId?: string;
  appClientId?: string;
  expiresAt?: number;
}

const getSigningSecret = () => {
  const secret = `${env.MONDAY_SIGNING_SECRET ?? ""}`;
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
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
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
    readClaimString(payload, "boardId") ?? readClaimNumberLikeString(dat?.board_id);
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

export const getMondaySessionTokenFromRequest = (request: Request) => {
  const fromHeader = request.headers.get("x-monday-session-token");
  if (typeof fromHeader === "string" && fromHeader.trim().length > 0) {
    return fromHeader.trim();
  }

  const authorization = request.headers.get("authorization");
  if (typeof authorization === "string") {
    const match = /^Bearer\s+(.+)$/i.exec(authorization);
    const token = match?.[1]?.trim();
    if (token) return token;
  }

  return null;
};

export const requireVerifiedMondaySession = async (request: Request) => {
  const token = getMondaySessionTokenFromRequest(request);
  if (!token) {
    throw new Error("Missing Monday session token");
  }
  return await verifyMondaySessionToken(token);
};
