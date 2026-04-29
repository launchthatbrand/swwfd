import "server-only";

import { createHash, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "~/env";

const getEncryptionKey = () => {
  const raw = env.OUTLOOK_TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error(
      "OUTLOOK_TOKEN_ENCRYPTION_KEY is missing. Set it before storing Outlook tokens.",
    );
  }
  return createHash("sha256").update(raw).digest();
};

export const encryptToken = (plaintext: string) => {
  const iv = randomBytes(12);
  const key = getEncryptionKey();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
};

export const decryptToken = (ciphertext: string) => {
  const data = Buffer.from(ciphertext, "base64url");
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const encrypted = data.subarray(28);
  const key = getEncryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
};
