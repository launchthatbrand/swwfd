import "server-only";

import { EncryptJWT, jwtDecrypt } from "jose";
import type { JWTPayload } from "jose";
import { env } from "~/env";

interface ZohoContentTokenPayload extends JWTPayload {
  html: string;
}

const getContentTokenSecret = () => {
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

export const createZohoContentToken = async (payload: ZohoContentTokenPayload) => {
  const secret = getContentTokenSecret();
  return await new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .encrypt(secret);
};

export const readZohoContentToken = async (token: string): Promise<ZohoContentTokenPayload> => {
  const secret = getContentTokenSecret();
  const decrypted = await jwtDecrypt<ZohoContentTokenPayload>(token, secret, {
    contentEncryptionAlgorithms: ["A256GCM"],
    keyManagementAlgorithms: ["dir"],
  });
  const html = decrypted.payload.html;
  if (typeof html !== "string" || html.trim().length === 0) {
    throw new Error("Zoho content token is invalid.");
  }
  return { html };
};
