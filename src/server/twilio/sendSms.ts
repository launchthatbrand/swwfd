import { getTwilioClient } from "./client";

const PHONE_PATTERN = /^\+?[1-9]\d{6,14}$/;

const normalizePhone = (value: string) => value.replace(/[^\d+]/g, "").trim();

export const sendSmsMessage = async (args: { to: string; body: string }) => {
  const to = normalizePhone(args.to);
  const body = args.body.trim();
  if (!PHONE_PATTERN.test(to)) {
    throw new Error("Recipient phone number is invalid. Use E.164 format.");
  }
  if (!body) {
    throw new Error("SMS body is required.");
  }

  const { client, config } = getTwilioClient();
  const message = await client.messages.create({
    to,
    from: config.fromPhone,
    body,
  });

  return {
    sid: message.sid,
    to: message.to ?? to,
    from: message.from ?? config.fromPhone,
  };
};

