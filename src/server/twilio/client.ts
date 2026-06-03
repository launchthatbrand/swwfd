import Twilio from "twilio";
import { getTwilioConfig } from "./config";

export const getTwilioClient = () => {
  const config = getTwilioConfig();
  if (!config) {
    throw new Error("Twilio is not configured.");
  }

  return {
    client: Twilio(config.accountSid, config.authToken),
    config,
  };
};

