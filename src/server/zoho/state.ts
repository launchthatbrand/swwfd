import "server-only";

import { SignJWT, jwtVerify } from "jose";
import type { JWTPayload } from "jose";
import { env } from "~/env";

export interface ZohoOAuthStatePayload extends JWTPayload {
  mondayAccountId: string;
  mondayUserId: string;
  mondayAppClientId?: string;
  redirectUri: string;
  nonce: string;
}

const getStateSecret = () => {
  const secret =
    env.ZOHO_OAUTH_STATE_SECRET?.trim() ??
    env.OUTLOOK_OAUTH_STATE_SECRET?.trim() ??
    env.MONDAY_SIGNING_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "ZOHO_OAUTH_STATE_SECRET is missing. Set it (or OUTLOOK_OAUTH_STATE_SECRET / MONDAY_SIGNING_SECRET fallback).",
    );
  }
  return new TextEncoder().encode(secret);
};

export const signZohoOAuthState = async (payload: ZohoOAuthStatePayload) => {
  const secret = getStateSecret();
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret);
};

export const verifyZohoOAuthState = async (token: string) => {
  const secret = getStateSecret();
  const verified = await jwtVerify<ZohoOAuthStatePayload>(token, secret, {
    algorithms: ["HS256"],
  });
  return verified.payload;
};
