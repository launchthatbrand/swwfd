export type SupportAssistantProviderKey =
  | "openai"
  | "anthropic"
  | "google"
  | "minimax";

export const SUPPORT_OPENAI_NODE_TYPE = "openai";
export const SUPPORT_ANTHROPIC_NODE_TYPE = "anthropic";
export const SUPPORT_GOOGLE_NODE_TYPE = "google";
export const SUPPORT_MINIMAX_NODE_TYPE = "minimax";

export const supportAssistantProviderLabels: Record<
  SupportAssistantProviderKey,
  string
> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google Gemini",
  minimax: "MiniMax",
};

export const supportAssistantProviderNodeTypes: Record<
  SupportAssistantProviderKey,
  string
> = {
  openai: SUPPORT_OPENAI_NODE_TYPE,
  anthropic: SUPPORT_ANTHROPIC_NODE_TYPE,
  google: SUPPORT_GOOGLE_NODE_TYPE,
  minimax: SUPPORT_MINIMAX_NODE_TYPE,
};

export const defaultSupportAssistantProvider: SupportAssistantProviderKey =
  "openai";

export const buildSupportAssistantOwnerKey = (
  provider: SupportAssistantProviderKey,
  organizationId: string,
) => `${supportAssistantProviderNodeTypes[provider]}:support:${organizationId}`;

export const buildSupportEmbeddingOwnerKey = (
  provider: "openai" | "google",
  organizationId: string,
) => `${supportAssistantProviderNodeTypes[provider]}:support-embedding:${organizationId}`;

export const buildSupportOpenAiOwnerKey = (organizationId: string) =>
  buildSupportAssistantOwnerKey("openai", organizationId);

export const buildSupportAnthropicOwnerKey = (organizationId: string) =>
  buildSupportAssistantOwnerKey("anthropic", organizationId);

export const buildSupportGoogleOwnerKey = (organizationId: string) =>
  buildSupportAssistantOwnerKey("google", organizationId);

export const buildSupportMinimaxOwnerKey = (organizationId: string) =>
  buildSupportAssistantOwnerKey("minimax", organizationId);
