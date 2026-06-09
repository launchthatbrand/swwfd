import type {
  SupportChannelDefinition,
  SupportChannelRuntime,
  SupportChannelRuntimeContext,
} from "./types";

const coreChatChannel: SupportChannelDefinition = {
  id: "chat",
  label: "Live chat",
  description: "Send when the visitor is currently connected.",
  order: 10,
  resolve: (context) => {
    if (context.visitorOnline) {
      return { enabled: true };
    }
    return {
      enabled: false,
      disabledReason: "Visitor is offline. Use email to continue the thread.",
    };
  },
};

const emailChannelDefinition: SupportChannelDefinition = {
  id: "email",
  label: "Email",
  description: "Send as an email and keep replies in this same thread.",
  order: 20,
  resolve: (context) => {
    if (!context.emailReady) {
      return {
        enabled: false,
        disabledReason: "Email delivery is not configured for this organization.",
      };
    }
    if (!context.hasContactEmail) {
      return {
        enabled: false,
        disabledReason: "This contact does not have an email address yet.",
      };
    }
    return { enabled: true };
  },
};

export const createEmailChannelDefinition = (): SupportChannelDefinition =>
  emailChannelDefinition;

export const buildSupportChannelRegistry = (
  context: SupportChannelRuntimeContext,
  extensions: SupportChannelDefinition[] = [],
): {
  channels: SupportChannelRuntime[];
  defaultChannelId: string | null;
} => {
  const definitions = [coreChatChannel, ...extensions];
  const channels: SupportChannelRuntime[] = definitions
    .map((definition) => {
      const state = definition.resolve(context);
      return {
        id: definition.id,
        label: definition.label,
        description: definition.description,
        enabled: state.enabled,
        disabledReason: state.disabledReason,
        order: definition.order ?? 999,
      };
    })
    .sort((a, b) => a.order - b.order);

  const enabledChannels = channels.filter((channel) => channel.enabled);
  const defaultChannelId = (() => {
    if (!enabledChannels.length) return null;
    const preferredChat = enabledChannels.find((channel) => channel.id === "chat");
    if (context.visitorOnline && preferredChat) {
      return preferredChat.id;
    }
    const preferredEmail = enabledChannels.find(
      (channel) => channel.id === "email",
    );
    if (preferredEmail) {
      return preferredEmail.id;
    }
    return enabledChannels[0]?.id ?? null;
  })();

  return {
    channels,
    defaultChannelId,
  };
};
