import { supportPlugin } from "./plugin";

export {
  PLUGIN_ID,
  type PluginId,
  type CreateSupportPluginDefinitionOptions,
  createSupportPluginDefinition,
  supportPlugin,
} from "./plugin";

export default supportPlugin;

export { SupportChatWidget } from "./components/SupportChatWidget";
export type { SupportChatWidgetProps } from "./components/SupportChatWidget";
export { SupportSystem } from "./admin/SupportSystem";
export type { SupportChatSettings, SupportChatFieldToggles } from "./settings";
export {
  openSupportAssistantExperience,
  SUPPORT_ASSISTANT_EVENT,
  DEFAULT_ASSISTANT_EXPERIENCE_ID,
  LMS_QUIZ_ASSISTANT_EXPERIENCE_ID,
  type AssistantExperienceTrigger,
} from "./assistant/experiences";
export {
  type SupportAssistantProviderKey,
  defaultSupportAssistantProvider,
  SUPPORT_OPENAI_NODE_TYPE,
  SUPPORT_ANTHROPIC_NODE_TYPE,
  SUPPORT_GOOGLE_NODE_TYPE,
  SUPPORT_MINIMAX_NODE_TYPE,
  buildSupportOpenAiOwnerKey,
  buildSupportAnthropicOwnerKey,
  buildSupportGoogleOwnerKey,
  buildSupportMinimaxOwnerKey,
  buildSupportAssistantOwnerKey,
  buildSupportEmbeddingOwnerKey,
  supportAssistantProviderLabels,
  supportAssistantProviderNodeTypes,
} from "./assistant/openai";
export {
  defaultSupportChatSettings,
  supportChatSettingsOptionKey,
  supportAssistantBaseInstructionsKey,
  supportAssistantProviderKey,
  supportAssistantModelIdKey,
  supportAssistantEmbeddingProviderKey,
  supportAssistantAnthropicModelIdKey,
  supportAssistantGoogleModelIdKey,
  supportAssistantMinimaxModelIdKey,
  supportAssistantModelOptionKeyByProvider,
  defaultSupportAssistantEmbeddingProvider,
  defaultSupportAssistantBaseInstructions,
} from "./settings";

export * from "./convex/bindings";


