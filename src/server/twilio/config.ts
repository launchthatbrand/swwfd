import { env } from "~/env";

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromPhone: string;
}

const normalize = (value: string | undefined) => value?.trim() ?? "";

export const getTwilioConfig = (): TwilioConfig | null => {
  const accountSid = normalize(env.TWILIO_ACCOUNT_SID);
  const authToken = normalize(env.TWILIO_AUTH_TOKEN);
  const fromPhone = normalize(env.TWILIO_FROM_PHONE);

  if (!accountSid || !authToken || !fromPhone) {
    return null;
  }

  return {
    accountSid,
    authToken,
    fromPhone,
  };
};

