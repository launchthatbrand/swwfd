export type SupportChannelId = "chat" | "email" | (string & {});

export interface SupportChannelRuntimeContext {
  conversationOrigin?: "chat" | "email";
  visitorOnline: boolean;
  emailReady: boolean;
  hasContactEmail: boolean;
  allowEmailIntake: boolean;
}

export interface SupportChannelRuntime {
  id: SupportChannelId;
  label: string;
  description?: string;
  enabled: boolean;
  disabledReason?: string;
  order: number;
}

export interface SupportChannelDefinition {
  id: SupportChannelId;
  label: string;
  description?: string;
  order?: number;
  resolve: (context: SupportChannelRuntimeContext) => {
    enabled: boolean;
    disabledReason?: string;
  };
}
