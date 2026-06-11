export type EmailProvider = "outlook" | "zoho";

export type EmailProviderReason =
  | "single_outlook"
  | "single_fallback_zoho"
  | "multi_zoho";

export interface EmailRecipientInput {
  to: string;
  contactItemId: string;
  ownerMondayUserId?: string;
  subject?: string;
  html?: string;
}

export interface EmailRecipientPrepared extends EmailRecipientInput {
  to: string;
  contactItemId: string;
  ownerMondayUserId: string;
  ownerEmail: string | null;
  subject: string;
  html: string;
}

export interface EmailSendResult {
  contactItemId: string;
  to: string;
  provider: EmailProvider;
  ok: boolean;
  error?: string;
}
