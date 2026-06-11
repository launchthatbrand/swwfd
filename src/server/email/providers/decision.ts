import type { EmailProviderReason } from "./types";

export const decideEmailProviderReason = (args: {
  recipientCount: number;
  ownerHasOutlookConnection: boolean;
}): EmailProviderReason => {
  if (args.recipientCount > 1) {
    return "multi_zoho";
  }
  return args.ownerHasOutlookConnection ? "single_outlook" : "single_fallback_zoho";
};
