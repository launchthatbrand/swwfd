import { timingSafeEqual } from "node:crypto";
import { env } from "~/env";

export const isAuthorizedMondayWebhookRequest = (request: Request) => {
  // Monday webhook routes are public endpoints by design; authenticate with shared secret.
  const provided = request.headers.get("x-monday-webhook-secret")?.trim();
  const expected = env.MONDAY_SIGNING_SECRET?.trim() ?? "";
  if (!provided || !expected) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(providedBuffer, expectedBuffer);
};

