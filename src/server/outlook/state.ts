import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { env } from "~/env";

export interface OutlookOAuthStatePayload {
  mondayAccountId: string;
  mondayUserId: string;
  mondayAppClientId?: string;
  redirectUri: string;
  nonce: string;
}

const getStateSecret = () => {
  const secret =
    env.OUTLOOK_OAUTH_STATE_SECRET?.trim() ?? env.MONDAY_SIGNING_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "OUTLOOK_OAUTH_STATE_SECRET is missing. Set it (or MONDAY_SIGNING_SECRET fallback).",
    );
  }
  return new TextEncoder().encode(secret);
};

export const signOutlookOAuthState = async (
  payload: OutlookOAuthStatePayload,
) => {
  const secret = getStateSecret();
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret);
};

export const verifyOutlookOAuthState = async (token: string) => {
  const secret = getStateSecret();
  const verified = await jwtVerify<OutlookOAuthStatePayload>(token, secret, {
    algorithms: ["HS256"],
  });
  return verified.payload;
};
