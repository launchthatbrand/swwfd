import { type SupportAssistantProviderKey } from "./assistant/openai";

export interface SupportChatFieldToggles {
  fullName: boolean;
  email: boolean;
  phone: boolean;
  company: boolean;
}

export interface SupportChatSettings {
  requireContact: boolean;
  loggedInUsersAutocapture: boolean;
  fields: SupportChatFieldToggles;
  introHeadline: string;
  welcomeMessage: string;
  privacyMessage: string;
  autoRespondToThreads: boolean;
}

export const supportChatSettingsOptionKey = "support_chat_settings";
export const supportContactCaptureKey = "support_contact_capture";
export const supportLoggedInUsersAutocaptureKey =
  "support_logged_in_users_autocapture";
export const supportContactCaptureFieldsKey = "support_contact_capture_fields";
export const supportIntroHeadlineKey = "support_intro_headline";
export const supportWelcomeMessageKey = "support_welcome_message";
export const supportPrivacyMessageKey = "support_privacy_message";
export const supportAssistantBaseInstructionsKey =
  "support_assistant_base_instructions";
export const supportAssistantProviderKey = "support_assistant_provider";
export const supportAssistantModelIdKey = "support_assistant_model_id";
export const supportAssistantEmbeddingProviderKey =
  "support_assistant_embedding_provider";
export const supportAssistantAnthropicModelIdKey =
  "support_assistant_model_id_anthropic";
export const supportAssistantGoogleModelIdKey =
  "support_assistant_model_id_google";
export const supportAssistantMinimaxModelIdKey =
  "support_assistant_model_id_minimax";
export const supportAssistantNoKeyBehaviorKey =
  "support_assistant_no_key_behavior";
export const supportAssistantNoKeyReplyMessageKey =
  "support_assistant_no_key_reply_message";
export const supportWidgetKeyOptionKey = "supportWidgetKey";
export const supportWidgetAllowedOriginsOptionKey =
  "supportWidgetAllowedOrigins";
export const supportLmsContentAuthoringOptionKey = "lms-content-authoring";
export const supportAutoRespondToThreadsKey = "support_auto_respond_to_threads";

export type SupportAssistantNoKeyBehavior =
  | "do_nothing"
  | "reply_with_message";

export type SupportAssistantEmbeddingProviderKey = "openai" | "google";

export const defaultSupportAssistantEmbeddingProvider: SupportAssistantEmbeddingProviderKey =
  "openai";

export type SupportAssistantModelByProviderOptionKey =
  | typeof supportAssistantModelIdKey
  | typeof supportAssistantAnthropicModelIdKey
  | typeof supportAssistantGoogleModelIdKey
  | typeof supportAssistantMinimaxModelIdKey;

export const supportAssistantModelOptionKeyByProvider: Record<
  SupportAssistantProviderKey,
  SupportAssistantModelByProviderOptionKey
> = {
  openai: supportAssistantModelIdKey,
  anthropic: supportAssistantAnthropicModelIdKey,
  google: supportAssistantGoogleModelIdKey,
  minimax: supportAssistantMinimaxModelIdKey,
};

export const defaultSupportAssistantNoKeyBehavior: SupportAssistantNoKeyBehavior =
  "reply_with_message";
export const defaultSupportAssistantNoKeyReplyMessage =
  "Support assistant is not fully configured yet (missing provider API key). Add one in Support -> Settings -> AI Assistant.";

export const defaultSupportAssistantBaseInstructions = [
  "You are a helpful support assistant for LaunchThat customers.",
  "Use the provided knowledge sources whenever they are available.",
  "If the answer is unclear, ask for clarification or suggest contacting a human representative.",
].join("\n");

export const defaultSupportChatSettings: SupportChatSettings = {
  requireContact: true,
  loggedInUsersAutocapture: true,
  fields: {
    fullName: true,
    email: true,
    phone: false,
    company: false,
  },
  introHeadline: "Before we get started",
  welcomeMessage:
    "Tell us a bit more about yourself so we can personalize your experience.",
  privacyMessage:
    "We’ll use this information to reply to your questions and keep you updated.",
  autoRespondToThreads: false,
};
