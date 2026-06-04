"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type {
  AssistantExperienceId,
  AssistantExperienceTrigger,
} from "../assistant/experiences";
import type { ChangeEvent, FormEvent } from "react";
import type { ChatWidgetTab, HelpdeskArticle } from "./supportChat/types";
import {
  DEFAULT_ASSISTANT_EXPERIENCE_ID,
  SUPPORT_ASSISTANT_EVENT,
  getAssistantExperience,
} from "../assistant/experiences";
import { DefaultChatTransport, isTextUIPart } from "ai";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerTrigger,
} from "@launchthatapp/ui/drawer";
import { Loader2, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";

import type { ChatHistoryMessage } from "./hooks/useSupportChatHistory";
import { ChatWidgetContent } from "./supportChat/ChatWidgetContent";
import { ChatWidgetFooter } from "./supportChat/ChatWidgetFooter";
import { ChatWidgetHeader } from "./supportChat/ChatWidgetHeader";
import type { GenericId as Id } from "convex/values";
import type { StoredSupportContact } from "./supportChat/utils";
import type { SupportChatSettings } from "../settings";
import type { UIMessage } from "ai";
import { buildSupportApiUrl } from "./hooks/apiUrl";
import { cn } from "@launchthatapp/ui/lib/utils";
import { createPortal } from "react-dom";
import { defaultSupportChatSettings } from "../settings";
import { parseLexicalRichText } from "./supportChat/utils";
import { useChat } from "@ai-sdk/react";
import { useHelpdeskArticles } from "./hooks/useHelpdeskArticles";
import { useMediaQuery } from "@launchthatapp/ui/hooks/use-media-query";
import { useSupportChatHistory } from "./hooks/useSupportChatHistory";
import { useSupportChatSettings } from "./hooks/useSupportChatSettings";
import { useSupportChatThread } from "./hooks/useSupportChatSession";
import { useSupportContactStorage } from "./hooks/useSupportContactStorage";
import { useSupportConvex } from "../convex/bindings";
import { useSupportConvexChat } from "./hooks/useSupportConvexChat";
import { useSupportPresence } from "./hooks/useSupportPresence";

const stripFormattedPayload = (rawContent: string) => {
  if (!rawContent) {
    return rawContent;
  }
  const trimmed = rawContent.trim();
  if (!trimmed.startsWith("{")) {
    return rawContent;
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === "object") {
      const kind = (parsed as any).kind;
      if (kind === "assistant_response_v1") {
        const text =
          typeof (parsed as any).text === "string" ? (parsed as any).text : "";
        return text;
      }
      if (
        kind === "lms_authoring_plan_v1" ||
        kind === "lms_authoring_apply_result_v1"
      ) {
        const text =
          typeof (parsed as any).text === "string" ? (parsed as any).text : "";
        return text;
      }
    }
    return parseLexicalRichText(trimmed);
  } catch (error) {
    console.warn("[support-chat] failed to parse rich text content", error);
    return rawContent;
  }
};

const parseAssistantSources = (rawContent: string) => {
  const trimmed = (rawContent ?? "").trim();
  if (!trimmed.startsWith("{")) return [];
  try {
    const parsed = JSON.parse(trimmed) as any;
    if (!parsed || typeof parsed !== "object") return [];
    if (parsed.kind !== "assistant_response_v1") return [];
    const sources = Array.isArray(parsed.sources) ? parsed.sources : [];
    const used = Array.isArray(parsed.usedSourceIndexes)
      ? parsed.usedSourceIndexes
        .map((v: any) => (typeof v === "number" ? v : Number(v)))
        .filter((v: number) => Number.isInteger(v))
      : null;

    const normalized = sources
      .map((s: unknown) => {
        const src = s as Record<string, unknown> | null;
        return {
          title: typeof src?.title === "string" ? src.title : "Source",
          url: typeof src?.url === "string" ? src.url : "",
          source: typeof src?.source === "string" ? src.source : undefined,
          slug: typeof src?.slug === "string" ? src.slug : undefined,
        };
      })
      .filter(
        (s: { url: string }) => typeof s.url === "string" && s.url.length > 0,
      )
      .slice(0, 10);

    if (used) {
      const maxIndex = normalized.length - 1;
      const selected = Array.from(
        new Set(
          used.filter((i: number) => i >= 0 && i <= maxIndex).slice(0, 10),
        ),
      );
      return selected
        .map((i) => (typeof i === "number" ? normalized[i] : undefined))
        .filter(Boolean);
    }

    return normalized;
  } catch {
    return [];
  }
};

const parseAssistantAuthoringPlan = (rawContent: string) => {
  const trimmed = (rawContent ?? "").trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.kind !== "lms_authoring_plan_v1") return null;
    if (
      !parsed.applyPayload ||
      typeof parsed.applyPayload !== "object" ||
      !parsed.plan ||
      typeof parsed.plan !== "object"
    ) {
      return null;
    }
    return {
      applyPayload: parsed.applyPayload as Record<string, unknown>,
      plan: parsed.plan as Record<string, unknown>,
    };
  } catch {
    return null;
  }
};

const isConvexId = (value?: string | null): boolean =>
  typeof value === "string" && /^[a-z0-9]{24}$/i.test(value);

export interface SupportChatWidgetProps {
  organizationId?: string | null;
  tenantName?: string;
  description?: string;
  apiPath?: string;
  apiBaseUrl?: string | null;
  widgetKey?: string | null;
  transportMode?: "legacy" | "convex";
  defaultContact?: StoredContact | null;
  bubbleVariant?: "offset" | "flush-right-square";
  mode?: "floating" | "embedded";
}

type LiveMessage = {
  _id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  agentName?: string;
};

const areUiMessagesEqual = (prev: UIMessage[], next: UIMessage[]): boolean => {
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    const previous = prev[i];
    const incoming = next[i];
    if (!previous || !incoming) return false;
    if (previous.id !== incoming.id || previous.role !== incoming.role) {
      return false;
    }
    const previousText = previous.parts
      .filter(isTextUIPart)
      .map((part) => part.text)
      .join("");
    const incomingText = incoming.parts
      .filter(isTextUIPart)
      .map((part) => part.text)
      .join("");
    if (previousText !== incomingText) return false;
  }
  return true;
};

type StoredContact = StoredSupportContact;

interface ContactFormState {
  fullName: string;
  email: string;
  phone: string;
  company: string;
}

const defaultContactForm: ContactFormState = {
  fullName: "",
  email: "",
  phone: "",
  company: "",
};

type PresenceEntry = {
  userId: string;
  online?: boolean;
  data?: Record<string, unknown>;
  name?: string;
};

const AGENT_PRESENCE_PREFIX = "agent:";
const VISITOR_PRESENCE_PREFIX = "visitor:";

const toVisitorPresenceUserId = (threadId: string) =>
  `${VISITOR_PRESENCE_PREFIX}${threadId}`;

const isAgentPresenceEntry = (entry: PresenceEntry) =>
  entry.userId.startsWith(AGENT_PRESENCE_PREFIX);

export function SupportChatWidget({
  organizationId,
  tenantName = "your organization",
  description = "Ask anything about your organization—policies, orders, or your course content. This assistant combines curated FAQs with product details specific to your account.",
  apiPath = "/api/support-chat",
  apiBaseUrl = null,
  widgetKey = null,
  transportMode = "convex",
  defaultContact = null,
  bubbleVariant = "offset",
  mode = "floating",
}: SupportChatWidgetProps) {
  if (!organizationId) {
    return null;
  }

  return (
    <SupportChatWidgetInner
      organizationId={organizationId}
      tenantName={tenantName}
      description={description}
      apiPath={apiPath}
      apiBaseUrl={apiBaseUrl}
      widgetKey={widgetKey}
      transportMode={transportMode}
      defaultContact={defaultContact}
      bubbleVariant={bubbleVariant}
      mode={mode}
    />
  );
}

interface SupportChatWidgetInnerProps {
  organizationId: string;
  tenantName: string;
  description: string;
  apiPath: string;
  apiBaseUrl: string | null;
  widgetKey: string | null;
  transportMode: "legacy" | "convex";
  defaultContact: StoredContact | null;
  bubbleVariant: "offset" | "flush-right-square";
  mode: "floating" | "embedded";
}

function SupportChatWidgetInner({
  organizationId,
  tenantName,
  description,
  apiPath,
  apiBaseUrl,
  widgetKey,
  transportMode,
  defaultContact,
  bubbleVariant,
  mode,
}: SupportChatWidgetInnerProps) {
  const convex = useSupportConvex();
  const isConvexTransport = transportMode === "convex";
  const [requestOrigin, setRequestOrigin] = useState<string | undefined>(() =>
    typeof window === "undefined" ? undefined : window.location.origin,
  );
  const [requestHost, setRequestHost] = useState<string | undefined>(() =>
    typeof window === "undefined" ? undefined : window.location.host,
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    setRequestOrigin(window.location.origin);
    setRequestHost(window.location.host);
  }, []);

  const normalizedApiRoot = apiPath.endsWith("/")
    ? apiPath.slice(0, -1)
    : apiPath;
  const threadApiPath = `${normalizedApiRoot}/thread`;
  const settingsApiPath = `${normalizedApiRoot}/settings`;
  const contactApiPath = `${normalizedApiRoot}/contact`;

  const { threadId, clientSessionId, bindThreadId } = useSupportChatThread(
    organizationId,
    threadApiPath,
    isConvexTransport ? null : widgetKey,
    apiBaseUrl,
  );
  const { contact, saveContact } = useSupportContactStorage(organizationId);
  const { settings, isLoading: settingsLoading } = useSupportChatSettings(
    organizationId,
    settingsApiPath,
    isConvexTransport ? null : widgetKey,
    apiBaseUrl,
  );
  const { articles: legacyHelpdeskArticles } = useHelpdeskArticles(
    apiPath,
    organizationId,
    isConvexTransport ? null : widgetKey,
    apiBaseUrl,
  );
  const convexWidgetSettings = useQuery(
    convex.support.widget.queries.getSettings,
    isConvexTransport && widgetKey
      ? {
        organizationId,
        widgetKey,
        requestOrigin,
        requestHost,
      }
      : "skip",
  ) as { settings?: SupportChatSettings } | undefined;
  const convexHelpdeskArticles = useQuery(
    convex.support.widget.queries.listHelpdeskArticles,
    isConvexTransport && widgetKey
      ? {
        organizationId,
        widgetKey,
        requestOrigin,
        requestHost,
        limit: 6,
      }
      : "skip",
  ) as HelpdeskArticle[] | undefined;
  const effectiveSettings =
    isConvexTransport && convexWidgetSettings?.settings
      ? {
        ...defaultSupportChatSettings,
        ...convexWidgetSettings.settings,
      }
      : settings;
  const effectiveSettingsLoading = isConvexTransport
    ? convexWidgetSettings === undefined
    : settingsLoading;
  const helpdeskArticles = isConvexTransport
    ? convexHelpdeskArticles ?? []
    : legacyHelpdeskArticles;

  const { initialMessages, isBootstrapped } = useSupportChatHistory(
    organizationId,
    threadId,
    {
      transportMode,
      widgetKey,
      requestOrigin,
      requestHost,
    },
  );

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    console.info(
      "[support-chat] widget bootstrap state",
      JSON.stringify({
        organizationId,
        hasWidgetKey: typeof widgetKey === "string" && widgetKey.trim().length > 0,
        threadId: threadId ?? null,
        clientSessionId: clientSessionId ?? null,
        settingsLoading: effectiveSettingsLoading,
        isBootstrapped,
      }),
    );
  }, [
    clientSessionId,
    isBootstrapped,
    organizationId,
    effectiveSettingsLoading,
    threadId,
    widgetKey,
  ]);

  if (!isBootstrapped || effectiveSettingsLoading) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        "[support-chat] rendering loading bubble",
        JSON.stringify({
          organizationId,
          settingsLoading,
          effectiveSettingsLoading,
          isBootstrapped,
          threadId: threadId ?? null,
          clientSessionId: clientSessionId ?? null,
        }),
      );
    }
    return (
      <button
        type="button"
        className={cn(
          "bg-muted text-muted-foreground fixed bottom-4 z-50 flex items-center gap-2 text-sm font-medium shadow-lg",
          bubbleVariant === "flush-right-square"
            ? "right-0 h-12 w-12 justify-center rounded-l-xl p-0"
            : "right-4 rounded-full px-4 py-3",
        )}
        disabled
        aria-busy="true"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        {bubbleVariant === "flush-right-square" ? (
          <span className="sr-only">Loading support…</span>
        ) : (
          "Loading support…"
        )}
      </button>
    );
  }

  return (
    <ChatSurface
      apiPath={apiPath}
      apiBaseUrl={apiBaseUrl}
      contactApiPath={contactApiPath}
      organizationId={organizationId}
      threadId={threadId ?? ""}
      tenantName={tenantName}
      description={description}
      widgetKey={widgetKey}
      clientSessionId={clientSessionId}
      initialMessages={initialMessages}
      settings={effectiveSettings}
      contact={contact}
      onContactSaved={saveContact}
      helpdeskArticles={helpdeskArticles}
      defaultContact={defaultContact}
      bubbleVariant={bubbleVariant}
      mode={mode}
      transportMode={transportMode}
      requestOrigin={requestOrigin}
      requestHost={requestHost}
      onThreadResolved={bindThreadId}
    />
  );
}

interface ChatSurfaceProps {
  organizationId: string;
  threadId: string;
  tenantName: string;
  description: string;
  apiPath: string;
  apiBaseUrl: string | null;
  contactApiPath: string;
  widgetKey: string | null;
  clientSessionId: string | null;
  initialMessages: ChatHistoryMessage[];
  settings: SupportChatSettings;
  contact: StoredContact | null;
  onContactSaved: (contact: StoredContact) => void;
  helpdeskArticles: HelpdeskArticle[];
  defaultContact: StoredContact | null;
  bubbleVariant: "offset" | "flush-right-square";
  mode: "floating" | "embedded";
  transportMode: "legacy" | "convex";
  requestOrigin?: string;
  requestHost?: string;
  onThreadResolved: (threadId: string) => void;
}

function ChatSurface({
  organizationId,
  threadId,
  tenantName,
  description,
  apiPath,
  apiBaseUrl,
  contactApiPath,
  widgetKey,
  clientSessionId,
  initialMessages,
  settings,
  contact,
  onContactSaved,
  helpdeskArticles,
  defaultContact,
  bubbleVariant,
  mode,
  transportMode,
  requestOrigin,
  requestHost,
  onThreadResolved,
}: ChatSurfaceProps) {
  const isConvexTransport = transportMode === "convex";
  const convex = useSupportConvex();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const prefersReducedMotion = useReducedMotion();
  const effectiveDefaultContact = settings.loggedInUsersAutocapture
    ? defaultContact
    : null;
  const hasWidgetKey =
    typeof widgetKey === "string" && widgetKey.trim().length > 0;

  useEffect(() => {
    if (transportMode !== "legacy") return;
    if (process.env.NODE_ENV === "production") return;
    console.warn(
      "[support-chat] legacy transport is deprecated; switch to transportMode=\"convex\".",
    );
  }, [transportMode]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (hasWidgetKey) return;
    console.warn(
      "[support-chat] widgetKey missing (chat disabled)",
      JSON.stringify({
        organizationId,
        apiPath,
        hasThreadId: Boolean(threadId),
        hasClientSessionId: Boolean(clientSessionId),
      }),
    );
  }, [apiPath, clientSessionId, hasWidgetKey, organizationId, threadId]);
  const normalizedContactId = useMemo(
    () =>
      contact?.contactId && isConvexId(contact.contactId)
        ? (contact.contactId as Id<"contacts">)
        : undefined,
    [contact?.contactId],
  );

  const openStorageKey = useMemo(
    () => `support-chat-open-${organizationId}`,
    [organizationId],
  );
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (mode === "embedded") {
      return true;
    }
    if (typeof window === "undefined") {
      return false;
    }
    const stored = window.localStorage.getItem(openStorageKey);
    return stored === "true";
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [contactForm, setContactForm] =
    useState<ContactFormState>(defaultContactForm);
  const [contactError, setContactError] = useState<string | null>(null);
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<ChatWidgetTab>("conversations");
  const setOpenWithLog = useCallback(
    (next: boolean, source: string) => {
      if (process.env.NODE_ENV !== "production") {
        console.info(
          "[support-chat] set open state",
          JSON.stringify({
            source,
            next,
            previous: isOpen,
            isMobile,
            organizationId,
            threadId,
            clientSessionId,
          }),
        );
      }
      setIsOpen(next);
    },
    [clientSessionId, isMobile, isOpen, organizationId, threadId],
  );
  const [presenceState, setPresenceState] = useState<PresenceEntry[]>([]);
  const [activeExperienceId, setActiveExperienceId] =
    useState<AssistantExperienceId>(DEFAULT_ASSISTANT_EXPERIENCE_ID);
  const [experienceContext, setExperienceContext] = useState<
    Record<string, unknown>
  >({});
  const activeExperience = useMemo(
    () => getAssistantExperience(activeExperienceId),
    [activeExperienceId],
  );

  const defaultContactConvexId = useMemo(
    () =>
      effectiveDefaultContact && isConvexId(effectiveDefaultContact.contactId)
        ? effectiveDefaultContact.contactId
        : undefined,
    [effectiveDefaultContact?.contactId],
  );

  const fallbackContactId = useMemo(
    () =>
      contact?.contactId ?? effectiveDefaultContact?.contactId ?? `visitor-${threadId}`,
    [contact?.contactId, effectiveDefaultContact?.contactId, threadId],
  );

  useEffect(() => {
    if (!effectiveDefaultContact) {
      return;
    }

    if (
      !contact ||
      contact.email !== effectiveDefaultContact.email ||
      contact.fullName !== effectiveDefaultContact.fullName ||
      (defaultContactConvexId && normalizedContactId !== defaultContactConvexId)
    ) {
      onContactSaved({
        contactId: defaultContactConvexId ?? fallbackContactId,
        fullName: effectiveDefaultContact.fullName ?? contact?.fullName,
        email: effectiveDefaultContact.email ?? contact?.email,
      });
    }
  }, [
    contact,
    effectiveDefaultContact,
    defaultContactConvexId,
    fallbackContactId,
    normalizedContactId,
    onContactSaved,
  ]);

  const hasAutocapturedIdentity = Boolean(
    effectiveDefaultContact?.contactId ||
      effectiveDefaultContact?.email ||
      effectiveDefaultContact?.fullName,
  );
  const shouldCollectContact =
    settings.requireContact && !contact && !hasAutocapturedIdentity;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (mode !== "floating") return;
    if (activeExperienceId !== DEFAULT_ASSISTANT_EXPERIENCE_ID) return;
    const path = window.location.pathname;
    if (!path.startsWith("/admin/edit")) return;
    const params = new URLSearchParams(window.location.search);
    const postType = params.get("post_type");
    const postId = params.get("post_id");
    if (
      (postType !== "lessons" && postType !== "topics") ||
      !postId ||
      postId.trim().length === 0
    ) {
      return;
    }
    setActiveExperienceId("lms-content");
    setExperienceContext((prev) => ({
      ...prev,
      mode: "authoring",
      organizationId,
      postTypeSlug: postType,
      postId,
    }));
  }, [activeExperienceId, mode, organizationId]);

  const requestBodyRef = useRef({
    organizationId,
    widgetKey,
    clientSessionId,
    threadId,
    contactId: normalizedContactId,
    contactEmail: contact?.email ?? effectiveDefaultContact?.email ?? undefined,
    contactName:
      contact?.fullName ?? effectiveDefaultContact?.fullName ?? undefined,
    experienceId: activeExperienceId,
    experienceContext,
  });

  useEffect(() => {
    requestBodyRef.current = {
      organizationId,
      widgetKey,
      clientSessionId,
      threadId,
      contactId: normalizedContactId,
      contactEmail: contact?.email ?? effectiveDefaultContact?.email ?? undefined,
      contactName:
        contact?.fullName ?? effectiveDefaultContact?.fullName ?? undefined,
      experienceId: activeExperienceId,
      experienceContext,
    };
  }, [
    activeExperienceId,
    clientSessionId,
    contact?.email,
    contact?.fullName,
    effectiveDefaultContact?.email,
    effectiveDefaultContact?.fullName,
    experienceContext,
    normalizedContactId,
    organizationId,
    widgetKey,
    threadId,
  ]);

  const transport = useMemo(
    () => {
      const url = new URL(
        buildSupportApiUrl({
          path: apiPath,
          apiBaseUrl,
        }),
      );
      url.searchParams.set("organizationId", organizationId);
      if (typeof widgetKey === "string" && widgetKey.trim().length > 0) {
        url.searchParams.set("widgetKey", widgetKey);
      }
      return new DefaultChatTransport({
        api: url.toString(),
        body: () => requestBodyRef.current,
      });
    },
    [apiBaseUrl, apiPath, organizationId, widgetKey],
  );

  const initialUiMessages = useMemo((): UIMessage[] => {
    return (initialMessages ?? []).map((message) => ({
      id: message.id,
      role: message.role,
      parts: [
        {
          type: "text",
          text:
            typeof message.content === "string"
              ? message.content
              : JSON.stringify(message.content),
        },
      ],
    }));
  }, [initialMessages]);

  const {
    messages: legacyMessages,
    setMessages: setLegacyMessages,
    sendMessage: sendLegacyMessage,
    regenerate: regenerateLegacyMessage,
    status: legacyStatus,
    error: legacyError,
  } = useChat({
    id: threadId,
    messages: initialUiMessages,
    transport,
    onError: (err) => {
      console.error("[support-chat] streaming error", err);
    },
  });
  const convexChat = useSupportConvexChat({
    enabled: isConvexTransport,
    organizationId,
    widgetKey,
    requestOrigin,
    requestHost,
    threadId,
    clientSessionId,
    initialMessages: initialUiMessages,
    contactId: normalizedContactId,
    contactEmail: contact?.email ?? effectiveDefaultContact?.email ?? undefined,
    contactName:
      contact?.fullName ?? effectiveDefaultContact?.fullName ?? undefined,
    experienceId: activeExperienceId,
    experienceContext,
    onThreadResolved,
  });
  const activeMessages = isConvexTransport ? convexChat.messages : legacyMessages;
  const setActiveMessages = isConvexTransport
    ? convexChat.setMessages
    : setLegacyMessages;
  const sendActiveMessage = isConvexTransport
    ? convexChat.sendMessage
    : sendLegacyMessage;
  const regenerateActiveMessage = isConvexTransport
    ? convexChat.regenerate
    : regenerateLegacyMessage;
  const activeStatus = isConvexTransport ? convexChat.status : legacyStatus;
  const activeError = isConvexTransport ? convexChat.error : legacyError;

  const [input, setInput] = useState("");
  const [isApplyingAuthoringPlan, setIsApplyingAuthoringPlan] = useState(false);
  const lastIdentityThreadLookupRef = useRef<string | null>(null);

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setInput(event.target.value);
    },
    [],
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!hasWidgetKey) {
        console.error(
          "[support-chat] widgetKey is missing; unable to send message",
        );
        return;
      }
      const trimmed = input.trim();
      if (!trimmed) {
        return;
      }
      void sendActiveMessage({ text: trimmed });
      setInput("");
    },
    [hasWidgetKey, input, sendActiveMessage],
  );

  useEffect(() => {
    if (isConvexTransport) {
      return;
    }
    if (!hasWidgetKey || !clientSessionId) {
      return;
    }
    const resolvedContactId =
      contact?.contactId ?? effectiveDefaultContact?.contactId;
    const resolvedContactEmail = contact?.email ?? effectiveDefaultContact?.email;
    const resolvedContactName =
      contact?.fullName ?? effectiveDefaultContact?.fullName;
    if (!resolvedContactId && !resolvedContactEmail) {
      return;
    }

    const lookupKey = [
      organizationId,
      clientSessionId,
      resolvedContactId ?? "",
      resolvedContactEmail ?? "",
      resolvedContactName ?? "",
    ].join(":");
    if (lastIdentityThreadLookupRef.current === lookupKey) {
      return;
    }
    lastIdentityThreadLookupRef.current = lookupKey;

    const controller = new AbortController();
    const url = new URL(
      buildSupportApiUrl({
        path: `${apiPath.endsWith("/") ? apiPath.slice(0, -1) : apiPath}/thread`,
        apiBaseUrl,
      }),
    );
    url.searchParams.set("organizationId", organizationId);
    if (widgetKey) {
      url.searchParams.set("widgetKey", widgetKey);
    }
    url.searchParams.set("clientSessionId", clientSessionId);
    if (resolvedContactId) {
      url.searchParams.set("contactId", resolvedContactId);
    }
    if (resolvedContactEmail) {
      url.searchParams.set("contactEmail", resolvedContactEmail);
    }
    if (resolvedContactName) {
      url.searchParams.set("contactName", resolvedContactName);
    }

    const resolveExistingThread = async () => {
      try {
        const response = await fetch(url.toString(), {
          method: "GET",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json()) as { threadId?: string };
        if (
          typeof data.threadId === "string" &&
          data.threadId.trim().length > 0 &&
          data.threadId !== threadId
        ) {
          onThreadResolved(data.threadId);
        }
      } catch {
        // Best-effort hydration for returning logged-in users.
      }
    };

    void resolveExistingThread();
    return () => controller.abort();
  }, [
    apiBaseUrl,
    apiPath,
    clientSessionId,
    contact?.contactId,
    contact?.email,
    contact?.fullName,
    effectiveDefaultContact?.contactId,
    effectiveDefaultContact?.email,
    effectiveDefaultContact?.fullName,
    hasWidgetKey,
    isConvexTransport,
    onThreadResolved,
    organizationId,
    threadId,
    widgetKey,
  ]);

  const resolvedConvexThread = useQuery(
    convex.support.widget.queries.resolveThread,
    isConvexTransport && hasWidgetKey && clientSessionId
      ? {
        organizationId,
        widgetKey,
        requestOrigin,
        requestHost,
        threadId,
        sessionId: threadId,
        clientSessionId,
        contactId: contact?.contactId ?? effectiveDefaultContact?.contactId,
        contactEmail: contact?.email ?? effectiveDefaultContact?.email,
      }
      : "skip",
  ) as { threadId?: string } | null | undefined;

  useEffect(() => {
    if (!isConvexTransport) {
      return;
    }
    const resolvedThreadId =
      typeof resolvedConvexThread?.threadId === "string"
        ? resolvedConvexThread.threadId.trim()
        : "";
    if (!resolvedThreadId || resolvedThreadId === threadId) {
      return;
    }
    onThreadResolved(resolvedThreadId);
  }, [isConvexTransport, onThreadResolved, resolvedConvexThread?.threadId, threadId]);

  const handleApplyAuthoringPlan = useCallback(
    async (applyPayload: Record<string, unknown>) => {
      if (!hasWidgetKey) return;
      if (!applyPayload || typeof applyPayload !== "object") return;
      const previousRequestBody = requestBodyRef.current;
      const nextContext = {
        ...(experienceContext ?? {}),
        mode: "authoring",
        action: "apply",
        applyPayload,
      };

      requestBodyRef.current = {
        ...previousRequestBody,
        experienceId: "lms-content",
        experienceContext: nextContext,
      };

      setIsApplyingAuthoringPlan(true);
      try {
        await sendActiveMessage({ text: "Apply this plan." });
      } finally {
        requestBodyRef.current = {
          ...previousRequestBody,
          experienceContext,
        };
        setIsApplyingAuthoringPlan(false);
      }
    },
    [experienceContext, hasWidgetKey, sendActiveMessage],
  );

  const isLoading = activeStatus === "submitted" || activeStatus === "streaming";

  const reload = useCallback(() => {
    void regenerateActiveMessage();
  }, [regenerateActiveMessage]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<AssistantExperienceTrigger>).detail;
      if (!detail) {
        return;
      }
      setIsOpen(true);
      const nextExperienceId =
        detail.experienceId ?? DEFAULT_ASSISTANT_EXPERIENCE_ID;
      setActiveExperienceId(nextExperienceId);
      const nextContext = detail.context ?? {};
      setExperienceContext(nextContext);

      requestBodyRef.current = {
        organizationId,
        widgetKey,
        clientSessionId,
        threadId,
        contactId: normalizedContactId,
        contactEmail: contact?.email ?? effectiveDefaultContact?.email ?? undefined,
        contactName:
          contact?.fullName ?? effectiveDefaultContact?.fullName ?? undefined,
        experienceId: nextExperienceId,
        experienceContext: nextContext,
      };

      if (detail.message && detail.message.length > 0) {
        if (!shouldCollectContact) {
          window.requestAnimationFrame(() => {
            void sendActiveMessage({ text: detail.message ?? "" });
          });
        }
      }
    };

    window.addEventListener(SUPPORT_ASSISTANT_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(
        SUPPORT_ASSISTANT_EVENT,
        handler as EventListener,
      );
    };
  }, [
    contact?.email,
    contact?.fullName,
    effectiveDefaultContact?.email,
    effectiveDefaultContact?.fullName,
    normalizedContactId,
    organizationId,
    sendActiveMessage,
    threadId,
    shouldCollectContact,
  ]);

  const displayedMessages = useMemo(
    () =>
      activeMessages
        .filter((message) => message.role !== "system")
        .map((message) => {
          const rawText = message.parts
            .filter(isTextUIPart)
            .map((part) => part.text)
            .join("");

          return {
            id: message.id,
            role: message.role,
            content: stripFormattedPayload(rawText),
            sources:
              message.role === "assistant"
                ? parseAssistantSources(rawText)
                : [],
            authoringPlan:
              message.role === "assistant"
                ? parseAssistantAuthoringPlan(rawText)
                : null,
          };
        }),
    [activeMessages],
  );
  const previousMessageCountRef = useRef(displayedMessages.length);

  const liveMessages =
    (useQuery(
      isConvexTransport
        ? convex.support.widget.queries.listMessages
        : convex.support.queries.listMessages,
      organizationId && threadId && (!isConvexTransport || widgetKey)
        ? {
          ...(isConvexTransport
            ? {
              organizationId: organizationId as Id<"organizations">,
              widgetKey,
              requestOrigin,
              requestHost,
              threadId,
              sessionId: threadId,
              limit: 500,
            }
            : {
              organizationId: organizationId as Id<"organizations">,
              sessionId: threadId,
            }),
        }
        : "skip",
    ) as LiveMessage[] | undefined) ?? [];

  useEffect(() => {
    if (isConvexTransport || !liveMessages) {
      return;
    }
    // Keep optimistic/in-flight messages while a request is submitted/streaming.
    // Otherwise the persisted Convex snapshot can briefly lag and hide the
    // just-submitted user message until the next query update.
    if (isLoading) {
      return;
    }

    const incomingUiMessages: UIMessage[] = liveMessages.map((message) => ({
      id: message._id,
      role: message.role,
      parts: [{ type: "text", text: message.content }],
    }));

    // Use Convex-persisted messages as the source of truth to avoid duplicates.
    // (The chat transport also keeps an in-memory message list for streaming.)
    // This replacement keeps the UI stable and prevents "double send / triple reply"
    // when the same message exists both in-memory and in Convex.
    if (areUiMessagesEqual(activeMessages, incomingUiMessages)) {
      return;
    }
    setActiveMessages(incomingUiMessages);
  }, [activeMessages, isConvexTransport, isLoading, liveMessages, setActiveMessages]);

  const agentMetadataByMessageId = useMemo(() => {
    const map = new Map<string, string | undefined>();
    for (const message of liveMessages) {
      const messageId = message._id ?? `${message.role}-${message.createdAt}`;
      if (message.agentName) {
        map.set(messageId, message.agentName);
      }
    }
    return map;
  }, [liveMessages]);

  const lastAssistantAgentName = useMemo(() => {
    for (let i = liveMessages.length - 1; i >= 0; i--) {
      const message = liveMessages[i];
      if (!message) {
        continue;
      }
      if (message.role === "assistant" && message.agentName) {
        return message.agentName;
      }
    }
    return undefined;
  }, [liveMessages]);

  type AgentPresenceResult = {
    agentUserId?: string;
    agentName?: string;
    status?: "typing" | "idle";
  };
  const presenceSessionId = clientSessionId ?? threadId;
  const agentPresence = useQuery(
    convex.support.queries.getAgentPresence,
    organizationId && presenceSessionId
      ? {
        organizationId: organizationId as Id<"organizations">,
        sessionId: presenceSessionId,
      }
      : "skip",
  ) as AgentPresenceResult | null | undefined;

  const resolvedAgentName: string =
    (agentPresence?.agentName as string | undefined) ??
    presenceState.find((entry) => entry.online && isAgentPresenceEntry(entry))
      ?.name ??
    lastAssistantAgentName ??
    "Support agent";

  const agentIsTyping = agentPresence?.status === "typing";

  const conversationMode = useQuery(
    convex.support.queries.getConversationMode,
    organizationId && threadId
      ? {
        organizationId: organizationId as Id<"organizations">,
        sessionId: threadId,
      }
      : "skip",
  );

  const isManualMode = conversationMode === "manual";

  const presenceRoomId =
    organizationId && presenceSessionId
      ? `support:${organizationId}:${presenceSessionId}`
      : null;

  const visitorPresenceMetadata = useMemo(
    () => ({
      role: "visitor" as const,
      name: contact?.fullName ?? undefined,
      email: contact?.email ?? undefined,
    }),
    [contact?.email, contact?.fullName],
  );

  const handlePresenceChange = useCallback((state: PresenceEntry[]) => {
    setPresenceState((previous) =>
      presenceArraysEqual(previous, state) ? previous : state,
    );
  }, []);

  const onlineAgentCount = useMemo(
    () =>
      presenceState.filter(
        (entry) => entry.online && isAgentPresenceEntry(entry),
      ).length,
    [presenceState],
  );
  const isAiAutoRespondEnabled = Boolean(settings.autoRespondToThreads);

  const recordMessage = useMutation(
    convex.support.mutations.recordMessage,
  );
  const captureWidgetContact = useMutation(
    convex.support.widget.mutations.captureContact,
  );
  const [isManualSending, setIsManualSending] = useState(false);

  const assistantIsResponding = !isManualMode && isLoading;
  const showSubmitSpinner = isManualMode ? isManualSending : isLoading;
  const isSubmitDisabled = showSubmitSpinner || input.trim().length === 0;
  const composerDisabled = assistantIsResponding || isManualSending;

  useEffect(() => {
    const list = messageListRef.current;
    if (!list) {
      return;
    }

    const previousCount = previousMessageCountRef.current;
    const hasNewMessage = displayedMessages.length > previousCount;

    if (
      hasNewMessage ||
      (assistantIsResponding && displayedMessages.length >= previousCount)
    ) {
      list.scrollTo({
        top: list.scrollHeight,
        behavior: previousCount > 0 ? "smooth" : "auto",
      });
    }

    previousMessageCountRef.current = displayedMessages.length;
  }, [assistantIsResponding, displayedMessages.length]);

  const handleChatSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (input.trim().length === 0) {
      return;
    }

    if (isManualMode) {
      if (isConvexTransport) {
        await handleSubmit(event);
        return;
      }
      const content = input.trim();
      const optimisticId = `manual-${Date.now()}`;
      setActiveMessages((prev) => [
        ...prev,
        {
          id: optimisticId,
          role: "user" as const,
          parts: [{ type: "text", text: content }],
        },
      ]);
      setInput("");
      setIsManualSending(true);
      try {
        await recordMessage({
          organizationId: organizationId as Id<"organizations">,
          sessionId: threadId,
          role: "user",
          content,
          contactId: normalizedContactId,
          contactName: contact?.fullName,
          contactEmail: contact?.email,
        });
      } catch (manualError) {
        console.error("[support-chat] manual send failed", manualError);
      } finally {
        setIsManualSending(false);
      }
      return;
    }

    await handleSubmit(event);
  };

  useEffect(() => {
    if (mode === "embedded") {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(openStorageKey);
    setIsOpen(stored === "true");
  }, [mode, openStorageKey]);

  useEffect(() => {
    if (mode === "embedded") {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(openStorageKey, JSON.stringify(isOpen));
  }, [isOpen, mode, openStorageKey]);

  useEffect(() => {
    if (isOpen && messageListRef.current) {
      messageListRef.current.scrollTo({
        top: messageListRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [isOpen]);

  const handleContactFieldChange = (
    field: keyof ContactFormState,
    value: string,
  ) => {
    setContactForm((prev) => ({ ...prev, [field]: value }));
  };

  const submitContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setContactError(null);

    const requiredErrors: string[] = [];
    if (settings.fields.fullName && !contactForm.fullName.trim()) {
      requiredErrors.push("Full name is required");
    }
    if (settings.fields.email && !contactForm.email.trim()) {
      requiredErrors.push("Email is required");
    }
    if (requiredErrors.length > 0) {
      setContactError(requiredErrors.join(". "));
      return;
    }

    setIsSubmittingContact(true);
    try {
      let data:
        | {
          contactId?: string;
          contact?: { fullName?: string };
          error?: string;
        }
        | undefined;
      if (isConvexTransport) {
        data = (await captureWidgetContact({
          organizationId,
          widgetKey: widgetKey ?? "",
          requestOrigin,
          requestHost,
          threadId,
          sessionId: threadId,
          clientSessionId: clientSessionId ?? undefined,
          fullName: contactForm.fullName.trim() || undefined,
          email: contactForm.email.trim() || undefined,
          phone: contactForm.phone.trim() || undefined,
          company: contactForm.company.trim() || undefined,
        })) as {
          contactId?: string;
          contact?: { fullName?: string };
        };
      } else {
        const contactUrl = new URL(
          buildSupportApiUrl({
            path: contactApiPath,
            apiBaseUrl,
          }),
        );
        contactUrl.searchParams.set("organizationId", organizationId);
        if (widgetKey) {
          contactUrl.searchParams.set("widgetKey", widgetKey);
        }
        const response = await fetch(contactUrl.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId,
            widgetKey,
            threadId,
            sessionId: clientSessionId ?? undefined,
            fullName: contactForm.fullName.trim() || undefined,
            email: contactForm.email.trim() || undefined,
            phone: contactForm.phone.trim() || undefined,
            company: contactForm.company.trim() || undefined,
          }),
        });
        data = (await response.json()) as {
          contactId?: string;
          contact?: { fullName?: string };
          error?: string;
        };
        if (!response.ok || !data.contactId) {
          throw new Error(data.error ?? "Unable to save contact");
        }
      }
      if (!data?.contactId) {
        throw new Error("Unable to save contact");
      }

      const persisted: StoredContact = {
        contactId: data.contactId as string,
        fullName: data.contact?.fullName ?? contactForm.fullName.trim(),
        email: contactForm.email.trim() || undefined,
      };

      onContactSaved(persisted);
      setContactForm(defaultContactForm);
      setContactError(null);
    } catch (err) {
      console.error("[support-chat] contact capture failed", err);
      setContactError(
        err instanceof Error
          ? err.message
          : "Unable to save your details. Please try again.",
      );
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const handleTabChange = (tab: ChatWidgetTab) => {
    setActiveTab(tab);
  };

  const handleComposerInputChange = (
    event: ChangeEvent<HTMLTextAreaElement>,
  ) => {
    handleInputChange(event);
  };
  const handleEmbeddedClose = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "launchthat-support:close" }, "*");
    }
  }, []);

  const chatTransition = useMemo(
    () =>
      prefersReducedMotion
        ? ({ duration: 0 } as const)
        : ({
          type: "spring",
          stiffness: 340,
          damping: 36,
          mass: 0.9,
        } as const),
    [prefersReducedMotion],
  );

  return (
    <>
      {(isOpen || mode === "embedded") && presenceRoomId && (
        <ConversationPresenceBridge
          presenceApi={convex.support.presence}
          roomId={presenceRoomId}
          userId={toVisitorPresenceUserId(presenceSessionId)}
          metadata={visitorPresenceMetadata}
          onChange={handlePresenceChange}
        />
      )}
      {mode === "embedded" ? (
        <div className="border-border/60 bg-card flex h-full min-h-[560px] w-full flex-col overflow-hidden border shadow-2xl">
          <ChatWidgetHeader
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onClose={handleEmbeddedClose}
            shouldCollectContact={shouldCollectContact}
            settings={settings}
            resolvedAgentName={resolvedAgentName}
            tenantName={tenantName}
            onlineAgentCount={onlineAgentCount}
            isAiAutoRespondEnabled={isAiAutoRespondEnabled}
            experienceLabel={
              activeExperienceId === DEFAULT_ASSISTANT_EXPERIENCE_ID
                ? undefined
                : activeExperience.label
            }
          />
          <ChatWidgetContent
            activeTab={activeTab}
            settings={settings}
            shouldCollectContact={shouldCollectContact}
            isExpanded
            contactForm={contactForm}
            contactError={contactError}
            isSubmittingContact={isSubmittingContact}
            onContactFieldChange={handleContactFieldChange}
            onSubmitContact={submitContact}
            messageListRef={messageListRef}
            displayedMessages={displayedMessages as ChatHistoryMessage[]}
            agentMetadataByMessageId={agentMetadataByMessageId}
            assistantIsResponding={assistantIsResponding}
            error={activeError ?? undefined}
            reload={reload}
            agentIsTyping={agentIsTyping && activeTab === "conversations"}
            resolvedAgentName={resolvedAgentName}
            tenantName={tenantName}
            description={description}
            helpdeskArticles={helpdeskArticles}
            isApplyingAuthoringPlan={isApplyingAuthoringPlan}
            onApplyAuthoringPlan={handleApplyAuthoringPlan}
          />
          <ChatWidgetFooter
            activeTab={activeTab}
            shouldCollectContact={shouldCollectContact}
            composerDisabled={composerDisabled}
            input={input}
            onInputChange={handleComposerInputChange}
            onSubmit={handleChatSubmit}
            isSubmitDisabled={isSubmitDisabled}
            showSubmitSpinner={showSubmitSpinner}
          />
        </div>
      ) : isMobile ? (
        <Drawer
          open={isOpen}
          onOpenChange={(next) => setOpenWithLog(next, "drawer:onOpenChange")}
          repositionInputs={false}
        >
          <DrawerTrigger asChild>
            <button
              type="button"
              className={cn(
                "bg-primary text-primary-foreground shadow-primary/40 focus-visible:ring-primary/80 fixed bottom-4 z-50 flex items-center gap-2 text-sm font-medium shadow-lg transition hover:scale-105 focus-visible:ring-2 focus-visible:outline-none",
                bubbleVariant === "flush-right-square"
                  ? "right-0 h-12 w-12 justify-center rounded-l-xl p-0"
                  : "right-4 rounded-full px-4 py-3",
              )}
              aria-label="Open support chat"
              onClick={() => {
                if (process.env.NODE_ENV !== "production") {
                  console.info(
                    "[support-chat] mobile bubble clicked",
                    JSON.stringify({
                      isOpen,
                      organizationId,
                      threadId,
                      clientSessionId,
                    }),
                  );
                }
              }}
            >
              <MessageCircle className="h-4 w-4" />
              {bubbleVariant === "flush-right-square" ? (
                <span className="sr-only">Support</span>
              ) : (
                "Support"
              )}
            </button>
          </DrawerTrigger>
          <DrawerContent className="p-0 bg-muted min-h-full">
            <div className="flex min-h-0 w-full flex-1 flex-col">
              <ChatWidgetHeader
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onClose={() => setOpenWithLog(false, "mobile:header:onClose")}
                shouldCollectContact={shouldCollectContact}
                settings={settings}
                resolvedAgentName={resolvedAgentName}
                tenantName={tenantName}
                onlineAgentCount={onlineAgentCount}
                isAiAutoRespondEnabled={isAiAutoRespondEnabled}
                experienceLabel={
                  activeExperienceId === DEFAULT_ASSISTANT_EXPERIENCE_ID
                    ? undefined
                    : activeExperience.label
                }
                className=""
              />
              <ChatWidgetContent
                activeTab={activeTab}
                settings={settings}
                shouldCollectContact={shouldCollectContact}
                isExpanded
                contactForm={contactForm}
                contactError={contactError}
                isSubmittingContact={isSubmittingContact}
                onContactFieldChange={handleContactFieldChange}
                onSubmitContact={submitContact}
                messageListRef={messageListRef}
                displayedMessages={displayedMessages as ChatHistoryMessage[]}
                agentMetadataByMessageId={agentMetadataByMessageId}
                assistantIsResponding={assistantIsResponding}
                error={activeError ?? undefined}
                reload={reload}
                agentIsTyping={agentIsTyping && activeTab === "conversations"}
                resolvedAgentName={resolvedAgentName}
                tenantName={tenantName}
                description={description}
                helpdeskArticles={helpdeskArticles}
                isApplyingAuthoringPlan={isApplyingAuthoringPlan}
                onApplyAuthoringPlan={handleApplyAuthoringPlan}
                className=""
              />
              <DrawerFooter className="p-0">
                <ChatWidgetFooter
                  activeTab={activeTab}
                  shouldCollectContact={shouldCollectContact}
                  composerDisabled={composerDisabled}
                  input={input}
                  className="bg-background"
                  onInputChange={handleComposerInputChange}
                  onSubmit={handleChatSubmit}
                  isSubmitDisabled={isSubmitDisabled}
                  showSubmitSpinner={showSubmitSpinner}
                />
              </DrawerFooter>
            </div>
          </DrawerContent>
        </Drawer>
      ) : (() => {
        const desktopFloatingUi = (
          <>
            <AnimatePresence>
              {isOpen ? (
                <motion.div
                  key="support-chat-window"
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={chatTransition}
                  style={{
                    borderRadius: isExpanded ? "20px 0px 0px 20px" : "16px",
                  }}
                  className={cn(
                    "border-border/60 bg-card fixed z-[1000] flex flex-col overflow-hidden border shadow-2xl",
                    isExpanded ? "inset-y-0 w-1/2" : "bottom-20 w-[24rem]",
                    bubbleVariant === "flush-right-square" || isExpanded
                      ? "right-0"
                      : "right-4",
                  )}
                >
                  <ChatWidgetHeader
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    onClose={() => {
                      setOpenWithLog(false, "desktop:header:onClose");
                      setIsExpanded(false);
                    }}
                    isExpanded={isExpanded}
                    onToggleExpanded={() => setIsExpanded((prev) => !prev)}
                    shouldCollectContact={shouldCollectContact}
                    settings={settings}
                    resolvedAgentName={resolvedAgentName}
                    tenantName={tenantName}
                    onlineAgentCount={onlineAgentCount}
                    isAiAutoRespondEnabled={isAiAutoRespondEnabled}
                    experienceLabel={
                      activeExperienceId === DEFAULT_ASSISTANT_EXPERIENCE_ID
                        ? undefined
                        : activeExperience.label
                    }
                  />
                  <ChatWidgetContent
                    activeTab={activeTab}
                    settings={settings}
                    shouldCollectContact={shouldCollectContact}
                    isExpanded={isExpanded}
                    contactForm={contactForm}
                    contactError={contactError}
                    isSubmittingContact={isSubmittingContact}
                    onContactFieldChange={handleContactFieldChange}
                    onSubmitContact={submitContact}
                    messageListRef={messageListRef}
                    displayedMessages={displayedMessages as ChatHistoryMessage[]}
                    agentMetadataByMessageId={agentMetadataByMessageId}
                    assistantIsResponding={assistantIsResponding}
                    error={activeError ?? undefined}
                    reload={reload}
                    agentIsTyping={agentIsTyping && activeTab === "conversations"}
                    resolvedAgentName={resolvedAgentName}
                    tenantName={tenantName}
                    description={description}
                    helpdeskArticles={helpdeskArticles}
                    isApplyingAuthoringPlan={isApplyingAuthoringPlan}
                    onApplyAuthoringPlan={handleApplyAuthoringPlan}
                  />
                  <ChatWidgetFooter
                    activeTab={activeTab}
                    shouldCollectContact={shouldCollectContact}
                    composerDisabled={composerDisabled}
                    input={input}
                    onInputChange={handleComposerInputChange}
                    onSubmit={handleChatSubmit}
                    isSubmitDisabled={isSubmitDisabled}
                    showSubmitSpinner={showSubmitSpinner}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>

            {!isExpanded ? (
              <button
                type="button"
                className={cn(
                  "bg-primary text-primary-foreground shadow-primary/40 focus-visible:ring-primary/80 fixed bottom-4 z-[1000] flex items-center gap-2 text-sm font-medium shadow-lg transition hover:scale-105 focus-visible:ring-2 focus-visible:outline-none",
                  bubbleVariant === "flush-right-square"
                    ? "right-0 h-12 w-12 justify-center rounded-l-xl p-0"
                    : "right-4 rounded-full px-4 py-3",
                )}
                onClick={() => setOpenWithLog(!isOpen, "desktop:bubble:onClick")}
                aria-expanded={isOpen}
                aria-label="Open support chat"
              >
                <MessageCircle className="h-4 w-4" />
                {bubbleVariant === "flush-right-square" ? (
                  <span className="sr-only">Support</span>
                ) : (
                  "Support"
                )}
              </button>
            ) : null}
          </>
        );

        return typeof document === "undefined"
          ? desktopFloatingUi
          : createPortal(desktopFloatingUi, document.body);
      })()}
    </>
  );
}

interface PresenceBridgeProps {
  presenceApi: {
    list: unknown;
    heartbeat: unknown;
    disconnect: unknown;
  };
  roomId: string;
  userId: string;
  metadata?: Record<string, unknown>;
  onChange: (state: PresenceEntry[]) => void;
}

const ConversationPresenceBridge = ({
  presenceApi,
  roomId,
  userId,
  metadata: _metadata,
  onChange,
}: PresenceBridgeProps) => {
  const presenceState = useSupportPresence({
    presenceApi,
    roomId,
    userId,
  }) as PresenceEntry[];

  useEffect(() => {
    onChange(presenceState);
  }, [onChange, presenceState]);

  return null;
};

const presenceArraysEqual = (
  previous: PresenceEntry[],
  next: PresenceEntry[],
) => {
  if (previous.length !== next.length) {
    return false;
  }
  for (let index = 0; index < previous.length; index++) {
    const prev = previous[index];
    const curr = next[index];
    if (!prev || !curr) {
      return false;
    }
    const prevMetadata =
      typeof prev.data === "object" && prev.data ? prev.data : {};
    const currMetadata =
      typeof curr.data === "object" && curr.data ? curr.data : {};
    if (
      prev.userId !== curr.userId ||
      prev.online !== curr.online ||
      JSON.stringify(prevMetadata) !== JSON.stringify(currMetadata)
    ) {
      return false;
    }
  }
  return true;
};
