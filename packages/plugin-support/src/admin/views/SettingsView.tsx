"use client";

// @ts-nocheck
import type { GenericId as Id } from "convex/values";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  ChevronsUpDown,
  Copy,
  Loader2,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Badge } from "@launchthatapp/ui/badge";
import { Button } from "@launchthatapp/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@launchthatapp/ui/card";
import { Checkbox } from "@launchthatapp/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@launchthatapp/ui/command";
import { Input } from "@launchthatapp/ui/input";
import { Label } from "@launchthatapp/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@launchthatapp/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@launchthatapp/ui/select";
import { Switch } from "@launchthatapp/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@launchthatapp/ui/tabs";
import { Textarea } from "@launchthatapp/ui/textarea";
import { toast } from "@launchthatapp/ui/toast";
import type { ColumnDefinition } from "@launchthatapp/ui/entity-list";
import { EntityList } from "@launchthatapp/ui/entity-list";

import type { SupportChatSettings } from "../../settings";
import {
  buildSupportAssistantOwnerKey,
  buildSupportEmbeddingOwnerKey,
  defaultSupportAssistantProvider,
  supportAssistantProviderLabels,
  supportAssistantProviderNodeTypes,
  type SupportAssistantProviderKey,
} from "../../assistant/openai";
import {
  defaultSupportAssistantEmbeddingProvider,
  defaultSupportAssistantBaseInstructions,
  defaultSupportAssistantNoKeyBehavior,
  defaultSupportAssistantNoKeyReplyMessage,
  defaultSupportChatSettings,
  supportAssistantAnthropicModelIdKey,
  supportAssistantBaseInstructionsKey,
  supportAssistantGoogleModelIdKey,
  supportAssistantMinimaxModelIdKey,
  supportAssistantModelOptionKeyByProvider,
  supportAssistantNoKeyBehaviorKey,
  supportAssistantNoKeyReplyMessageKey,
  supportAssistantEmbeddingProviderKey,
  supportAssistantProviderKey,
  supportAutoRespondToThreadsKey,
  supportAssistantModelIdKey,
  supportContactCaptureFieldsKey,
  supportContactCaptureKey,
  supportIntroHeadlineKey,
  supportLmsContentAuthoringOptionKey,
  supportLoggedInUsersAutocaptureKey,
  supportPrivacyMessageKey,
  supportWidgetAllowedOriginsOptionKey,
  supportWidgetKeyOptionKey,
  supportWelcomeMessageKey,
} from "../../settings";
import { useSupportConvex } from "../../convex/bindings";

const fieldLabels: Record<keyof SupportChatSettings["fields"], string> = {
  fullName: "Full name",
  email: "Email",
  phone: "Phone",
  company: "Company",
};

type RagField = "title" | "excerpt" | "content";

const ragFieldLabels: Record<RagField, string> = {
  title: "Title",
  excerpt: "Excerpt",
  content: "Content / body",
};

const defaultRagFieldState: Record<RagField, boolean> = {
  title: true,
  excerpt: false,
  content: true,
};

interface RagSourceFormState {
  sourceId?: string;
  postTypeSlug?: string;
  fields: Record<RagField, boolean>;
  includeTags: boolean;
  metaFieldKeys: string[];
  additionalMetaKeys: string;
  displayName: string;
  isEnabled: boolean;
  useCustomBaseInstructions: boolean;
  baseInstructions: string;
}

interface RagSourceRecordRow {
  _id: string;
  postId: string;
  entryKey?: string;
  lastStatus?: string;
  lastAttemptAt?: number;
  lastSuccessAt?: number;
  lastError?: string;
  lastEntryId?: string;
  lastEntryStatus?: "pending" | "ready" | "replaced";
}

interface SupportCannedResponseRow {
  _id: string;
  title: string;
  body: string;
  channels: Array<"chat" | "email">;
  isActive: boolean;
  sortOrder?: number;
  updatedAt: number;
}

interface SupportCannedResponseFormState {
  title: string;
  body: string;
  channels: {
    chat: boolean;
    email: boolean;
  };
  isActive: boolean;
  sortOrder: string;
}

const createDefaultCannedResponseFormState = (): SupportCannedResponseFormState => ({
  title: "",
  body: "",
  channels: {
    chat: true,
    email: false,
  },
  isActive: true,
  sortOrder: "",
});

const createDefaultRagFormState = (): RagSourceFormState => ({
  fields: { ...defaultRagFieldState },
  includeTags: false,
  metaFieldKeys: [],
  additionalMetaKeys: "",
  displayName: "",
  isEnabled: true,
  useCustomBaseInstructions: false,
  baseInstructions: "",
});

const mergeSupportSettings = (
  patch?: Partial<SupportChatSettings>,
): SupportChatSettings => ({
  ...defaultSupportChatSettings,
  ...patch,
  fields: {
    ...defaultSupportChatSettings.fields,
    ...(patch?.fields ?? {}),
  },
});

const fieldKeys = Object.keys(defaultSupportChatSettings.fields) as Array<
  keyof SupportChatSettings["fields"]
>;

const parseBooleanOption = (
  value: string | number | boolean | null | undefined,
  fallback: boolean,
) => {
  if (typeof value === "boolean") return value;
  if (value === 1) return true;
  if (value === 0) return false;
  if (typeof value === "string") {
    if (value === "1" || value.toLowerCase() === "true") return true;
    if (value === "0" || value.toLowerCase() === "false") return false;
  }
  return fallback;
};

const parseStringOption = (
  value: string | number | boolean | null | undefined,
  fallback: string,
) => {
  if (typeof value === "string") return value;
  return fallback;
};

const parseFieldsOption = (
  value: string | number | boolean | null | undefined,
  fallback: SupportChatSettings["fields"],
): SupportChatSettings["fields"] => {
  if (typeof value !== "string") return fallback;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return fallback;
    const flags: SupportChatSettings["fields"] = { ...fallback };
    fieldKeys.forEach((key) => {
      flags[key] = parsed.includes(key);
    });
    return flags;
  } catch {
    return fallback;
  }
};

const serializeFieldsOption = (fields: SupportChatSettings["fields"]) =>
  JSON.stringify(fieldKeys.filter((key) => fields[key]));

const parseAllowedOriginsOption = (
  value: string | number | boolean | null | undefined,
): string[] => {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((origin): origin is string => typeof origin === "string")
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
  } catch {
    return [];
  }
};

const normalizeAllowedOriginsInput = (raw: string): string[] => {
  const values = raw
    .split(/\r?\n|,/g)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  const normalized = values.map((value) => {
    try {
      const url = new URL(value);
      if (url.pathname !== "/" || url.search || url.hash) {
        throw new Error("Origin cannot include path, query, or hash.");
      }
      return url.origin;
    } catch {
      throw new Error(
        `Invalid origin "${value}". Use full origins like https://example.com`,
      );
    }
  });

  return Array.from(new Set(normalized));
};

interface SettingsViewProps {
  organizationId: Id<"organizations">;
}

const supportRoleOptions = [
  { value: "support.agent", label: "Support Agent" },
  { value: "support.admin", label: "Support Admin" },
] as const;

const supportAssistantProviders: SupportAssistantProviderKey[] = [
  "openai",
  "anthropic",
  "google",
  "minimax",
];

const supportAssistantEmbeddingProviders: Array<"openai" | "google"> = [
  "openai",
  "google",
];

export function SettingsView({ organizationId }: SettingsViewProps) {
  const convex = useSupportConvex();
  const [searchParamsState, setSearchParamsState] = useState<URLSearchParams>(
    () =>
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams(),
  );
  const replaceSearchParams = useCallback((params: URLSearchParams) => {
    if (typeof window === "undefined") {
      return;
    }
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", nextUrl);
    setSearchParamsState(new URLSearchParams(nextQuery));
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const syncSearchParams = () => {
      setSearchParamsState(new URLSearchParams(window.location.search));
    };
    syncSearchParams();
    window.addEventListener("popstate", syncSearchParams);
    window.addEventListener("lt:navigate", syncSearchParams as EventListener);
    return () => {
      window.removeEventListener("popstate", syncSearchParams);
      window.removeEventListener("lt:navigate", syncSearchParams as EventListener);
    };
  }, []);
  const [roleUserPickerOpen, setRoleUserPickerOpen] = useState(false);
  const [roleUserSearch, setRoleUserSearch] = useState("");
  const [selectedRoleUserId, setSelectedRoleUserId] = useState<
    Id<"users"> | undefined
  >(undefined);
  const [selectedRoleKey, setSelectedRoleKey] = useState<
    "support.agent" | "support.admin"
  >("support.agent");
  const [isAssigningSupportRole, setIsAssigningSupportRole] = useState(false);
  const [removingAssignmentId, setRemovingAssignmentId] = useState<string | null>(
    null,
  );
  const organizationUsersPage = useQuery(
    convex.core.users.queries.listOrganizationUsersPage,
    {
      organizationId,
      page: 0,
      pageSize: 20,
      ...(roleUserSearch.trim().length > 0
        ? { search: roleUserSearch.trim() }
        : {}),
    },
  );
  const selectedUserRoleNames = useQuery(
    convex.core.roles.queries.getRoleNamesForUser,
    selectedRoleUserId
      ? {
          userId: selectedRoleUserId,
        }
      : "skip",
  );
  const requireContactOption = useQuery(
    convex.support.options.getSupportOption,
    {
      organizationId,
      key: supportContactCaptureKey,
    },
  );
  const loggedInUsersAutocaptureOption = useQuery(
    convex.support.options.getSupportOption,
    {
      organizationId,
      key: supportLoggedInUsersAutocaptureKey,
    },
  );
  const contactFieldsOption = useQuery(
    convex.support.options.getSupportOption,
    {
      organizationId,
      key: supportContactCaptureFieldsKey,
    },
  );
  const introHeadlineOption = useQuery(
    convex.support.options.getSupportOption,
    {
      organizationId,
      key: supportIntroHeadlineKey,
    },
  );
  const welcomeMessageOption = useQuery(
    convex.support.options.getSupportOption,
    {
      organizationId,
      key: supportWelcomeMessageKey,
    },
  );
  const privacyMessageOption = useQuery(
    convex.support.options.getSupportOption,
    {
      organizationId,
      key: supportPrivacyMessageKey,
    },
  );
  const assistantBaseInstructionsOption = useQuery(
    convex.support.options.getSupportOption,
    {
      organizationId,
      key: supportAssistantBaseInstructionsKey,
    },
  );
  const assistantNoKeyBehaviorOption = useQuery(
    convex.support.options.getSupportOption,
    {
      organizationId,
      key: supportAssistantNoKeyBehaviorKey,
    },
  );
  const assistantNoKeyReplyMessageOption = useQuery(
    convex.support.options.getSupportOption,
    {
      organizationId,
      key: supportAssistantNoKeyReplyMessageKey,
    },
  );
  const widgetKeyOption = useQuery(
    convex.support.options.getSupportOption,
    {
      organizationId,
      key: supportWidgetKeyOptionKey,
    },
  );
  const widgetAllowedOriginsOption = useQuery(
    convex.support.options.getSupportOption,
    {
      organizationId,
      key: supportWidgetAllowedOriginsOptionKey,
    },
  );
  const lmsContentAuthoringOption = useQuery(
    convex.support.options.getSupportOption,
    {
      organizationId,
      key: supportLmsContentAuthoringOptionKey,
    },
  );
  const autoRespondToThreadsOption = useQuery(
    convex.support.options.getSupportOption,
    {
      organizationId,
      key: supportAutoRespondToThreadsKey,
    },
  );
  const assistantProviderOption = useQuery(convex.support.options.getSupportOption, {
    organizationId,
    key: supportAssistantProviderKey,
  });
  const assistantEmbeddingProviderOption = useQuery(
    convex.support.options.getSupportOption,
    {
      organizationId,
      key: supportAssistantEmbeddingProviderKey,
    },
  );
  const saveSupportOption = useMutation(
    convex.support.options.saveSupportOption,
  );
  const assignPluginRoleToUser = useMutation(
    convex.core.roles.mutations.assignPluginRoleToUser,
  );
  const removePluginRoleFromUser = useMutation(
    convex.core.roles.mutations.removePluginRoleFromUser,
  );
  const emailSettings = useQuery(convex.support.queries.getEmailSettings, {
    organizationId,
  });
  const saveEmailSettings = useMutation(
    convex.support.mutations.saveEmailSettings,
  );
  const beginDomainVerification = useMutation(
    convex.support.mutations.beginDomainVerification,
  );
  const cannedResponses = useQuery(
    convex.support.queries.listSupportCannedResponses,
    {
      organizationId,
      includeInactive: true,
    },
  ) as SupportCannedResponseRow[] | undefined;
  const createSupportCannedResponse = useMutation(
    convex.support.mutations.createSupportCannedResponse,
  );
  const updateSupportCannedResponse = useMutation(
    convex.support.mutations.updateSupportCannedResponse,
  );
  const setSupportCannedResponseActive = useMutation(
    convex.support.mutations.setSupportCannedResponseActive,
  );
  const deleteSupportCannedResponse = useMutation(
    convex.support.mutations.deleteSupportCannedResponse,
  );
  const [formState, setFormState] = useState<SupportChatSettings>(
    mergeSupportSettings(),
  );
  const [isSaving, setIsSaving] = useState(false);
  const tabParam = (searchParamsState.get("tab") ?? "").toLowerCase().trim();
  const selectedKnowledgeSourceIdParam = searchParamsState.get("id") ?? "";
  const selectedKnowledgeSourceId =
    selectedKnowledgeSourceIdParam.trim().length > 0
      ? selectedKnowledgeSourceIdParam.trim()
      : null;
  const normalizedTabValue = useMemo<
    "general" | "copy" | "responses" | "email" | "assistant" | "knowledge"
  >(() => {
    const map: Record<
      string,
      "general" | "copy" | "responses" | "email" | "assistant" | "knowledge"
    > = {
      general: "general",
      copy: "copy",
      responses: "responses",
      canned_responses: "responses",
      "canned-responses": "responses",
      email: "email",
      assistant: "assistant",
      knowledge: "knowledge",
      knowledge_sources: "knowledge",
      "knowledge-sources": "knowledge",
    };
    return map[tabParam] ?? "general";
  }, [tabParam]);
  const [domainInput, setDomainInput] = useState("");
  const [isEmailTogglePending, setIsEmailTogglePending] = useState(false);
  const [isDomainMutationPending, setIsDomainMutationPending] = useState(false);
  const [isTestingInbound, setIsTestingInbound] = useState(false);
  const [assistantBaseInstructions, setAssistantBaseInstructions] = useState(
    defaultSupportAssistantBaseInstructions,
  );
  const [assistantNoKeyBehavior, setAssistantNoKeyBehavior] = useState<
    "do_nothing" | "reply_with_message"
  >(defaultSupportAssistantNoKeyBehavior);
  const [assistantNoKeyReplyMessage, setAssistantNoKeyReplyMessage] = useState(
    defaultSupportAssistantNoKeyReplyMessage,
  );
  const [isSavingAssistantInstructions, setIsSavingAssistantInstructions] =
    useState(false);
  const [isSavingAssistantNoKeyBehavior, setIsSavingAssistantNoKeyBehavior] =
    useState(false);
  const [isAutoRespondToThreadsEnabled, setIsAutoRespondToThreadsEnabled] =
    useState(false);
  const [isSavingAutoRespondToThreads, setIsSavingAutoRespondToThreads] =
    useState(false);
  const [isLmsContentAuthoringEnabled, setIsLmsContentAuthoringEnabled] =
    useState(false);
  const [isSavingLmsContentAuthoring, setIsSavingLmsContentAuthoring] =
    useState(false);
  const [isGeneratingWidgetKey, setIsGeneratingWidgetKey] = useState(false);
  const [widgetAllowedOriginsInput, setWidgetAllowedOriginsInput] = useState("");
  const [isSavingWidgetAllowedOrigins, setIsSavingWidgetAllowedOrigins] =
    useState(false);
  const [cannedResponseForm, setCannedResponseForm] =
    useState<SupportCannedResponseFormState>(
      createDefaultCannedResponseFormState(),
    );
  const [editingCannedResponseId, setEditingCannedResponseId] = useState<
    string | null
  >(null);
  const [isSavingCannedResponse, setIsSavingCannedResponse] = useState(false);
  const [busyCannedResponseId, setBusyCannedResponseId] = useState<string | null>(
    null,
  );

  const widgetKey =
    typeof widgetKeyOption === "string" && widgetKeyOption.trim().length > 0
      ? widgetKeyOption
      : null;
  const currentOrigin =
    typeof window !== "undefined" ? window.location.origin : "";
  const widgetScriptUrl = currentOrigin
    ? `${currentOrigin}/support/widget/v1.js`
    : "/support/widget/v1.js";
  const embedSnippet =
    widgetKey && currentOrigin
      ? `<script async src="${widgetScriptUrl}"\n  data-organization-id="${organizationId}"\n  data-widget-key="${widgetKey}"\n  data-app-base-url="${currentOrigin}"\n  data-api-base-url="${currentOrigin}"\n></script>`
      : "";

  const assignableMembers = useMemo(() => {
    const rows = (organizationUsersPage?.rows ?? []) as Array<{
      userId: Id<"users">;
      _id: Id<"users">;
      name?: string;
      email?: string;
    }>;
    return rows
      .map((row) => {
        const userId = (row._id ?? row.userId) as Id<"users">;
        const name = row.name?.trim() || null;
        const email = row.email?.trim() || null;
        const label = name ?? email ?? userId;
        return {
          userId,
          name,
          email,
          label,
          searchText: `${label} ${email ?? ""}`.trim(),
        };
      })
      .filter((member) => member.userId);
  }, [organizationUsersPage]);

  const selectedRoleUser = useMemo(() => {
    if (!selectedRoleUserId) return null;
    for (const member of assignableMembers) {
      if (member.userId === selectedRoleUserId) return member;
    }
    return null;
  }, [assignableMembers, selectedRoleUserId]);

  const selectedUserSupportRoles = useMemo(() => {
    const roleNames = (selectedUserRoleNames ?? []) as string[];
    const prefix = "plugin:support:";
    return roleNames
      .filter((value) => typeof value === "string" && value.startsWith(prefix))
      .map((value) => value.slice(prefix.length))
      .filter(
        (value): value is "support.agent" | "support.admin" =>
          value === "support.agent" || value === "support.admin",
      );
  }, [selectedUserRoleNames]);

  const handleAssignSupportRole = async () => {
    if (!selectedRoleUserId) {
      toast.error("Select a user first.");
      return;
    }

    setIsAssigningSupportRole(true);
    try {
      await assignPluginRoleToUser({
        organizationId,
        userId: selectedRoleUserId,
        roleKey: selectedRoleKey,
        sourcePluginId: "support",
      });
      toast.success("Support role assigned.");
      setRoleUserSearch("");
      setRoleUserPickerOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to assign support role.";
      toast.error(message);
    } finally {
      setIsAssigningSupportRole(false);
    }
  };

  const handleRemoveSupportRole = async (
    roleKey: "support.agent" | "support.admin",
  ) => {
    if (!selectedRoleUserId) {
      toast.error("Select a user first.");
      return;
    }
    setRemovingAssignmentId(roleKey);
    try {
      await removePluginRoleFromUser({
        organizationId,
        userId: selectedRoleUserId,
        roleKey,
        sourcePluginId: "support",
      });
      toast.success("Support role removed.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to remove support role.";
      toast.error(message);
    } finally {
      setRemovingAssignmentId(null);
    }
  };

  const handleTabChange = (value: string) => {
    if (
      value !== "general" &&
      value !== "copy" &&
      value !== "responses" &&
      value !== "email" &&
      value !== "assistant" &&
      value !== "knowledge"
    ) {
      return;
    }
    const params = new URLSearchParams(searchParamsState.toString());
    if (value === "general") {
      params.delete("tab");
      params.delete("id");
    } else if (value === "knowledge") {
      params.set("tab", "knowledge_sources");
    } else {
      params.set("tab", value);
      params.delete("id");
    }
    replaceSearchParams(params);
  };

  const handleOpenKnowledgeSourceDetail = (sourceId: string) => {
    const params = new URLSearchParams(searchParamsState.toString());
    params.set("tab", "knowledge_sources");
    params.set("id", sourceId);
    replaceSearchParams(params);
  };

  const handleCloseKnowledgeSourceDetail = () => {
    const params = new URLSearchParams(searchParamsState.toString());
    params.set("tab", "knowledge_sources");
    params.delete("id");
    replaceSearchParams(params);
  };

  const resetCannedResponseForm = () => {
    setEditingCannedResponseId(null);
    setCannedResponseForm(createDefaultCannedResponseFormState());
  };

  const handleEditCannedResponse = (row: SupportCannedResponseRow) => {
    setEditingCannedResponseId(row._id);
    setCannedResponseForm({
      title: row.title,
      body: row.body,
      channels: {
        chat: row.channels.includes("chat"),
        email: row.channels.includes("email"),
      },
      isActive: row.isActive,
      sortOrder:
        typeof row.sortOrder === "number" && Number.isFinite(row.sortOrder)
          ? String(row.sortOrder)
          : "",
    });
  };

  const handleSaveCannedResponse = async () => {
    const title = cannedResponseForm.title.trim();
    const body = cannedResponseForm.body.trim();
    if (!title) {
      toast.error("Title is required.");
      return;
    }
    if (!body) {
      toast.error("Response body is required.");
      return;
    }
    const channels = [
      ...(cannedResponseForm.channels.chat ? (["chat"] as const) : []),
      ...(cannedResponseForm.channels.email ? (["email"] as const) : []),
    ];
    if (channels.length === 0) {
      toast.error("Select at least one channel.");
      return;
    }
    const sortOrderRaw = cannedResponseForm.sortOrder.trim();
    const parsedSortOrder =
      sortOrderRaw.length > 0 ? Number.parseInt(sortOrderRaw, 10) : undefined;
    if (
      sortOrderRaw.length > 0 &&
      (!Number.isFinite(parsedSortOrder) || Number.isNaN(parsedSortOrder))
    ) {
      toast.error("Sort order must be a valid number.");
      return;
    }

    setIsSavingCannedResponse(true);
    try {
      if (editingCannedResponseId) {
        await updateSupportCannedResponse({
          id: editingCannedResponseId,
          organizationId,
          title,
          body,
          channels,
          isActive: cannedResponseForm.isActive,
          sortOrder: parsedSortOrder,
        });
        toast.success("Canned response updated.");
      } else {
        await createSupportCannedResponse({
          organizationId,
          title,
          body,
          channels,
          isActive: cannedResponseForm.isActive,
          sortOrder: parsedSortOrder,
        });
        toast.success("Canned response created.");
      }
      resetCannedResponseForm();
    } catch (error) {
      console.error("[support-settings] save canned response error", error);
      toast.error("Unable to save canned response. Please try again.");
    } finally {
      setIsSavingCannedResponse(false);
    }
  };

  const handleSetCannedResponseActive = async (
    responseId: string,
    isActive: boolean,
  ) => {
    setBusyCannedResponseId(responseId);
    try {
      await setSupportCannedResponseActive({
        id: responseId,
        organizationId,
        isActive,
      });
      toast.success(isActive ? "Response activated." : "Response deactivated.");
    } catch (error) {
      console.error("[support-settings] set canned response active error", error);
      toast.error("Unable to update response state.");
    } finally {
      setBusyCannedResponseId(null);
    }
  };

  const handleDeleteCannedResponse = async (responseId: string) => {
    if (!window.confirm("Delete this canned response?")) {
      return;
    }
    setBusyCannedResponseId(responseId);
    try {
      await deleteSupportCannedResponse({
        id: responseId,
        organizationId,
      });
      if (editingCannedResponseId === responseId) {
        resetCannedResponseForm();
      }
      toast.success("Canned response deleted.");
    } catch (error) {
      console.error("[support-settings] delete canned response error", error);
      toast.error("Unable to delete canned response.");
    } finally {
      setBusyCannedResponseId(null);
    }
  };

  useEffect(() => {
    if (
      requireContactOption === undefined ||
      loggedInUsersAutocaptureOption === undefined ||
      contactFieldsOption === undefined ||
      introHeadlineOption === undefined ||
      welcomeMessageOption === undefined ||
      privacyMessageOption === undefined ||
      assistantBaseInstructionsOption === undefined ||
      assistantNoKeyBehaviorOption === undefined ||
      assistantNoKeyReplyMessageOption === undefined
    ) {
      return;
    }
    const next = mergeSupportSettings({
      requireContact: parseBooleanOption(
        requireContactOption,
        defaultSupportChatSettings.requireContact,
      ),
      loggedInUsersAutocapture: parseBooleanOption(
        loggedInUsersAutocaptureOption,
        defaultSupportChatSettings.loggedInUsersAutocapture,
      ),
      fields: parseFieldsOption(
        contactFieldsOption,
        defaultSupportChatSettings.fields,
      ),
      introHeadline: parseStringOption(
        introHeadlineOption,
        defaultSupportChatSettings.introHeadline,
      ),
      welcomeMessage: parseStringOption(
        welcomeMessageOption,
        defaultSupportChatSettings.welcomeMessage,
      ),
      privacyMessage: parseStringOption(
        privacyMessageOption,
        defaultSupportChatSettings.privacyMessage,
      ),
    });
    setFormState(next);
    setAssistantBaseInstructions(
      parseStringOption(
        assistantBaseInstructionsOption,
        defaultSupportAssistantBaseInstructions,
      ),
    );
    const parsedNoKeyBehavior = parseStringOption(
      assistantNoKeyBehaviorOption,
      defaultSupportAssistantNoKeyBehavior,
    );
    setAssistantNoKeyBehavior(
      parsedNoKeyBehavior === "do_nothing"
        ? "do_nothing"
        : "reply_with_message",
    );
    setAssistantNoKeyReplyMessage(
      parseStringOption(
        assistantNoKeyReplyMessageOption,
        defaultSupportAssistantNoKeyReplyMessage,
      ),
    );
  }, [
    requireContactOption,
    loggedInUsersAutocaptureOption,
    contactFieldsOption,
    introHeadlineOption,
    welcomeMessageOption,
    privacyMessageOption,
    assistantBaseInstructionsOption,
    assistantNoKeyBehaviorOption,
    assistantNoKeyReplyMessageOption,
  ]);
  useEffect(() => {
    if (widgetAllowedOriginsOption === undefined) {
      return;
    }
    const parsed = parseAllowedOriginsOption(widgetAllowedOriginsOption);
    setWidgetAllowedOriginsInput(parsed.join("\n"));
  }, [widgetAllowedOriginsOption]);
  useEffect(() => {
    if (lmsContentAuthoringOption === undefined) {
      return;
    }
    setIsLmsContentAuthoringEnabled(
      parseBooleanOption(lmsContentAuthoringOption, false),
    );
  }, [lmsContentAuthoringOption]);
  useEffect(() => {
    if (autoRespondToThreadsOption === undefined) {
      return;
    }
    setIsAutoRespondToThreadsEnabled(
      parseBooleanOption(autoRespondToThreadsOption, false),
    );
  }, [autoRespondToThreadsOption]);
  useEffect(() => {
    if (assistantProviderOption === undefined) {
      return;
    }
    const value = parseStringOption(
      assistantProviderOption,
      defaultSupportAssistantProvider,
    );
    if (
      value === "openai" ||
      value === "anthropic" ||
      value === "google" ||
      value === "minimax"
    ) {
      setSelectedAssistantProvider(value);
      return;
    }
    setSelectedAssistantProvider(defaultSupportAssistantProvider);
  }, [assistantProviderOption]);
  useEffect(() => {
    if (assistantEmbeddingProviderOption === undefined) {
      return;
    }
    const value = parseStringOption(
      assistantEmbeddingProviderOption,
      defaultSupportAssistantEmbeddingProvider,
    );
    if (value === "openai" || value === "google") {
      setSelectedEmbeddingProvider(value);
      return;
    }
    setSelectedEmbeddingProvider(defaultSupportAssistantEmbeddingProvider);
  }, [assistantEmbeddingProviderOption]);
  const ragSources = useQuery(convex.support.queries.listRagSources, {
    organizationId,
  });
  const selectedKnowledgeSourceRecordsResult = useQuery(
    convex.support.queries.listRagSourceRecords,
    selectedKnowledgeSourceId
      ? {
          organizationId,
          sourceId: selectedKnowledgeSourceId,
          limit: 1000,
          includeHistorical: false,
        }
      : "skip",
  ) as
    | {
        source?: {
          _id?: string;
          postTypeSlug?: string;
          sourceType?: "postType" | "lmsPostType";
          displayName?: string;
          isEnabled?: boolean;
          lastIndexedAt?: number;
        } | null;
        records?: RagSourceRecordRow[];
      }
    | undefined;
  const postTypes =
    (useQuery(convex.core.postTypes.list, {
      organizationId,
      includeBuiltIn: true,
    }) as
      | Array<{
          slug?: string;
          name?: string;
          _id?: string;
          supports?: { customFields?: boolean } | undefined;
          storageKind?: string;
        }>
      | undefined) ?? [];
  const saveRagSource: any = useMutation(
    convex.support.mutations.saveRagSourceConfig,
  );
  const deleteRagSource: any = useMutation(
    convex.support.mutations.deleteRagSourceConfig,
  );
  const triggerRagReindexForPost: any = useMutation(
    convex.support.mutations.triggerRagReindexForPost,
  );
  const triggerRagReindexForPosts: any = useMutation(
    convex.support.mutations.triggerRagReindexForPosts,
  );
  const triggerRagReindexForPostType: any = useMutation(
    convex.support.mutations.triggerRagReindexForPostType,
  );
  const deleteRagRecordForPost: any = useMutation(
    convex.support.mutations.deleteRagRecordForPost,
  );
  const [selectedAssistantProvider, setSelectedAssistantProvider] =
    useState<SupportAssistantProviderKey>(defaultSupportAssistantProvider);
  const [selectedEmbeddingProvider, setSelectedEmbeddingProvider] = useState<
    "openai" | "google"
  >(defaultSupportAssistantEmbeddingProvider);
  const assistantOwnerKey = useMemo(
    () =>
      buildSupportAssistantOwnerKey(
        selectedAssistantProvider,
        organizationId as string,
      ),
    [organizationId, selectedAssistantProvider],
  );
  const providerConnections = useQuery(
    convex.integrations.connections.queries.list,
    assistantOwnerKey
      ? {
          nodeType:
            supportAssistantProviderNodeTypes[selectedAssistantProvider],
          ownerId: assistantOwnerKey,
        }
      : "skip",
  ) as
    | Array<{
        _id: string;
        status?: string;
        metadata?: { maskedCredentials?: Record<string, string> } | null;
      }>
    | undefined;
  const embeddingOwnerKey = useMemo(
    () =>
      buildSupportEmbeddingOwnerKey(
        selectedEmbeddingProvider,
        organizationId as string,
      ),
    [organizationId, selectedEmbeddingProvider],
  );
  const embeddingConnections = useQuery(
    convex.integrations.connections.queries.list,
    embeddingOwnerKey
      ? {
          nodeType:
            supportAssistantProviderNodeTypes[selectedEmbeddingProvider],
          ownerId: embeddingOwnerKey,
        }
      : "skip",
  ) as
    | Array<{
        _id: string;
        status?: string;
        metadata?: { maskedCredentials?: Record<string, string> } | null;
      }>
    | undefined;

  const upsertConnection = useAction(
    convex.integrations.connections.actions.upsertForOwner,
  );
  const deleteConnection = useAction(
    convex.integrations.connections.actions.remove,
  );
  const listOpenAiModels = useAction(
    convex.support.openaiModels.listAvailableModels,
  );
  const listAnthropicModels = useAction(
    convex.support.anthropicModels.listAvailableModels,
  );
  const listGoogleModels = useAction(convex.support.googleModels.listAvailableModels);
  const listMinimaxModels = useAction(
    convex.support.minimaxModels.listAvailableModels,
  );
  const [knowledgeForm, setKnowledgeForm] = useState<RagSourceFormState>(
    createDefaultRagFormState(),
  );
  const [assistantKeyInput, setAssistantKeyInput] = useState("");
  const [isSavingAssistantKey, setIsSavingAssistantKey] = useState(false);
  const [isRemovingAssistantKey, setIsRemovingAssistantKey] = useState(false);
  const [embeddingKeyInput, setEmbeddingKeyInput] = useState("");
  const [isSavingEmbeddingKey, setIsSavingEmbeddingKey] = useState(false);
  const [isRemovingEmbeddingKey, setIsRemovingEmbeddingKey] = useState(false);
  const [availableAssistantModels, setAvailableAssistantModels] = useState<
    string[]
  >([]);
  const [isLoadingAssistantModels, setIsLoadingAssistantModels] = useState(false);
  const openAiModelOption = useQuery(
    convex.support.options.getSupportOption,
    {
      organizationId,
      key: supportAssistantModelIdKey,
    },
  );
  const anthropicModelOption = useQuery(convex.support.options.getSupportOption, {
    organizationId,
    key: supportAssistantAnthropicModelIdKey,
  });
  const googleModelOption = useQuery(convex.support.options.getSupportOption, {
    organizationId,
    key: supportAssistantGoogleModelIdKey,
  });
  const minimaxModelOption = useQuery(convex.support.options.getSupportOption, {
    organizationId,
    key: supportAssistantMinimaxModelIdKey,
  });
  const providerModelOptionValues: Record<SupportAssistantProviderKey, unknown> = {
    openai: openAiModelOption,
    anthropic: anthropicModelOption,
    google: googleModelOption,
    minimax: minimaxModelOption,
  };
  const defaultModelByProvider: Record<SupportAssistantProviderKey, string> = {
    openai: "gpt-4o-mini",
    anthropic: "claude-3-5-haiku-latest",
    google: "gemini-2.0-flash",
    minimax: "MiniMax-M2",
  };
  const selectedAssistantModelId = useMemo(() => {
    const selectedValue = providerModelOptionValues[selectedAssistantProvider];
    if (typeof selectedValue === "string" && selectedValue.trim().length > 0) {
      return selectedValue.trim();
    }
    return defaultModelByProvider[selectedAssistantProvider];
  }, [providerModelOptionValues, selectedAssistantProvider]);
  const assistantConnection = Array.isArray(providerConnections)
    ? providerConnections[0]
    : undefined;
  const assistantMaskedCredential = assistantConnection?.metadata?.maskedCredentials
    ? Object.values(assistantConnection.metadata?.maskedCredentials ?? {})[0]
    : undefined;
  const isAssistantProviderConnected = assistantConnection
    ? (assistantConnection.status ?? "connected") === "connected"
    : false;
  const embeddingConnection = Array.isArray(embeddingConnections)
    ? embeddingConnections[0]
    : undefined;
  const embeddingMaskedCredential = embeddingConnection?.metadata?.maskedCredentials
    ? Object.values(embeddingConnection.metadata?.maskedCredentials ?? {})[0]
    : undefined;
  const isEmbeddingProviderConnected = embeddingConnection
    ? (embeddingConnection.status ?? "connected") === "connected"
    : false;
  const requiresSecondaryEmbeddingProvider =
    selectedAssistantProvider === "minimax" ||
    selectedAssistantProvider === "anthropic";
  const activePostTypeSlug = knowledgeForm.postTypeSlug;
  const postTypeFields: Array<{
    key: string;
    name?: string;
    isSystem?: boolean;
  }> = [];
  const [isSavingSource, setIsSavingSource] = useState(false);
  const [recordActionByPostId, setRecordActionByPostId] = useState<
    Record<string, "reindex" | "delete" | undefined>
  >({});
  const [isBulkReindexing, setIsBulkReindexing] = useState(false);

  const typedMetaValue: Partial<SupportChatSettings> | undefined = undefined;

  useEffect(() => {
    setFormState(mergeSupportSettings(typedMetaValue));
  }, [typedMetaValue]);

  useEffect(() => {
    if (emailSettings?.customDomain !== undefined) {
      setDomainInput(emailSettings.customDomain ?? "");
    }
  }, [emailSettings?.customDomain]);

  const activeFieldCount = useMemo(() => {
    const toggles = Object.values(formState.fields);
    return toggles.filter(Boolean).length;
  }, [formState.fields]);

  const handleToggleField = (field: keyof SupportChatSettings["fields"]) => {
    setFormState((prev) => ({
      ...prev,
      fields: {
        ...prev.fields,
        [field]: !prev.fields[field],
      },
    }));
  };

  const knowledgeSourcesLoading =
    ragSources === undefined ||
    postTypes === undefined ||
    (activePostTypeSlug ? postTypeFields === undefined : false);
  const knowledgeSources = (ragSources ?? []) as any[];
  const postTypeOptions = postTypes ?? [];
  const postTypeFieldOptions = postTypeFields ?? [];

  const postTypeLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const type of postTypeOptions) {
      if (!type?.slug) continue;
      map.set(type.slug, type.name ?? type.slug);
    }
    return map;
  }, [postTypeOptions]);

  const metaFieldOptions = useMemo(() => {
    return postTypeFieldOptions
      .filter((field) => !field.isSystem)
      .map((field) => ({
        key: field.key,
        label: field.name ?? field.key,
      }));
  }, [postTypeFieldOptions]);

  const selectedKnowledgeSource = useMemo(() => {
    if (!selectedKnowledgeSourceId) return null;
    return (
      knowledgeSources.find(
        (source) => String((source as any)?._id ?? "") === selectedKnowledgeSourceId,
      ) ?? null
    );
  }, [knowledgeSources, selectedKnowledgeSourceId]);

  const selectedKnowledgeSourceLabel = selectedKnowledgeSource
    ? postTypeLabelMap.get(selectedKnowledgeSource.postTypeSlug) ??
      selectedKnowledgeSource.postTypeSlug
    : selectedKnowledgeSourceRecordsResult?.source?.postTypeSlug ?? "Knowledge source";

  const knowledgeSourceRecordRows = useMemo(
    () =>
      ((selectedKnowledgeSourceRecordsResult?.records ?? []) as RagSourceRecordRow[]).map(
        (record) => ({
          id: record._id,
          postId: record.postId,
          postTypeSlug:
            selectedKnowledgeSourceRecordsResult?.source?.postTypeSlug ?? undefined,
          sourceType:
            selectedKnowledgeSourceRecordsResult?.source?.sourceType ?? undefined,
          entryKey: record.entryKey ?? "",
          status: record.lastStatus ?? "unknown",
          lastAttemptAt: record.lastAttemptAt ?? null,
          lastSuccessAt: record.lastSuccessAt ?? null,
          lastError: record.lastError ?? "",
          entryStatus: record.lastEntryStatus ?? "",
        }),
      ),
    [selectedKnowledgeSourceRecordsResult],
  );

  const knowledgeSourceRecordColumns = useMemo<
    ColumnDefinition<(typeof knowledgeSourceRecordRows)[number]>[]
  >(
    () => [
      {
        id: "postId",
        accessorKey: "postId",
        header: "Record ID",
        cell: (row: any) => <span className="font-mono text-xs">{row.postId}</span>,
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Index status",
        cell: (row: any) => (
          <Badge variant={row.status === "indexed" ? "secondary" : "outline"}>
            {row.status}
          </Badge>
        ),
      },
      {
        id: "lastAttemptAt",
        header: "Last attempt",
        cell: (row: any) => (
          <span className="text-muted-foreground text-xs">
            {row.lastAttemptAt
              ? formatDistanceToNow(row.lastAttemptAt, { addSuffix: true })
              : "Never"}
          </span>
        ),
      },
      {
        id: "lastSuccessAt",
        header: "Last success",
        cell: (row: any) => (
          <span className="text-muted-foreground text-xs">
            {row.lastSuccessAt
              ? formatDistanceToNow(row.lastSuccessAt, { addSuffix: true })
              : "Not indexed yet"}
          </span>
        ),
      },
      {
        id: "lastError",
        accessorKey: "lastError",
        header: "Last error",
        cell: (row: any) =>
          row.lastError ? (
            <span className="line-clamp-1 max-w-[22rem] text-xs">{row.lastError}</span>
          ) : (
            <span className="text-muted-foreground text-xs">-</span>
          ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: (row: any) => {
          const action = recordActionByPostId[row.postId];
          const isReindexing = action === "reindex";
          const isDeleting = action === "delete";
          const isBusy = isReindexing || isDeleting || isBulkReindexing;
          return (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isBusy}
                onClick={() => handleReindexKnowledgeSourceRecord(row)}
              >
                {isReindexing ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                )}
                Re-index
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={isBusy}
                onClick={() => handleDeleteKnowledgeSourceRecord(row)}
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                )}
                Delete
              </Button>
            </div>
          );
        },
      },
    ],
    [
      handleDeleteKnowledgeSourceRecord,
      handleReindexKnowledgeSourceRecord,
      isBulkReindexing,
      recordActionByPostId,
    ],
  );

  const handleResetKnowledgeForm = () => {
    setKnowledgeForm(createDefaultRagFormState());
  };

  const handleSelectKnowledgeSource = (
    source: (typeof knowledgeSources)[number],
  ) => {
    setKnowledgeForm({
      sourceId: source._id as string,
      postTypeSlug: source.postTypeSlug,
      fields: {
        title: source.fields.includes("title"),
        excerpt: source.fields.includes("excerpt"),
        content: source.fields.includes("content"),
      },
      includeTags: source.includeTags,
      metaFieldKeys: source.metaFieldKeys ?? [],
      additionalMetaKeys: "",
      displayName: source.displayName ?? "",
      isEnabled: source.isEnabled,
      useCustomBaseInstructions: Boolean(source.useCustomBaseInstructions),
      baseInstructions: source.baseInstructions ?? "",
    });
  };

  const handleToggleRagField = (field: RagField) => {
    setKnowledgeForm((previous) => ({
      ...previous,
      fields: {
        ...previous.fields,
        [field]: !previous.fields[field],
      },
    }));
  };

  const handleToggleMetaField = (key: string) => {
    setKnowledgeForm((previous) => {
      const exists = previous.metaFieldKeys.includes(key);
      return {
        ...previous,
        metaFieldKeys: exists
          ? previous.metaFieldKeys.filter((current) => current !== key)
          : [...previous.metaFieldKeys, key],
      };
    });
  };

  const handleSaveKnowledgeSource = async () => {
    if (!knowledgeForm.postTypeSlug) {
      toast.error("Select a post type to index.");
      return;
    }

    const selectedFields = (
      Object.keys(knowledgeForm.fields) as RagField[]
    ).filter((key) => knowledgeForm.fields[key]);

    if (selectedFields.length === 0) {
      toast.error("Enable at least one content field.");
      return;
    }

    setIsSavingSource(true);
    try {
      const manualMetaFields = knowledgeForm.additionalMetaKeys
        .split(",")
        .map((key) => key.trim())
        .filter(Boolean);
      const metaFields = [...knowledgeForm.metaFieldKeys, ...manualMetaFields];

      await (saveRagSource as any)({
        organizationId,
        sourceId: knowledgeForm.sourceId,
        postTypeSlug: knowledgeForm.postTypeSlug ?? "",
        fields: selectedFields,
        includeTags: knowledgeForm.includeTags,
        metaFieldKeys: metaFields,
        displayName: knowledgeForm.displayName.trim() || undefined,
        isEnabled: knowledgeForm.isEnabled,
        useCustomBaseInstructions: knowledgeForm.useCustomBaseInstructions,
        baseInstructions: knowledgeForm.baseInstructions,
      });

      toast.success(
        "Knowledge source saved. Content from this post type will be indexed going forward.",
      );

      if (!knowledgeForm.sourceId) {
        handleResetKnowledgeForm();
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save knowledge source.",
      );
    } finally {
      setIsSavingSource(false);
    }
  };

  const handleSaveAssistantKey = async () => {
    const trimmed = assistantKeyInput.trim();
    const providerLabel = supportAssistantProviderLabels[selectedAssistantProvider];
    if (!trimmed) {
      toast.error(`Enter your ${providerLabel} API key.`);
      return;
    }
    setIsSavingAssistantKey(true);
    try {
      await upsertConnection({
        nodeType: supportAssistantProviderNodeTypes[selectedAssistantProvider],
        name: `Support ${providerLabel}`,
        ownerId: assistantOwnerKey,
        credentials: trimmed,
        status: "connected",
      });
      setAssistantKeyInput("");
      toast.success(`${providerLabel} API key saved.`);
    } catch (error) {
      console.error("[support-settings] save assistant key", error);
      toast.error(
        error instanceof Error
          ? error.message
          : `Unable to save ${providerLabel} API key.`,
      );
    } finally {
      setIsSavingAssistantKey(false);
    }
  };

  const handleDisconnectAssistantProvider = async () => {
    if (!assistantConnection) {
      return;
    }
    const providerLabel = supportAssistantProviderLabels[selectedAssistantProvider];
    setIsRemovingAssistantKey(true);
    try {
      await deleteConnection({
        id: (assistantConnection as any)?._id as Id<"connections">,
      });
      await saveSupportOption({
        organizationId,
        key: supportAutoRespondToThreadsKey,
        value: false,
      });
      setIsAutoRespondToThreadsEnabled(false);
      toast.success(`${providerLabel} key removed.`);
    } catch (error) {
      console.error("[support-settings] remove assistant key", error);
      toast.error(
        error instanceof Error
          ? error.message
          : `Unable to remove the ${providerLabel} key.`,
      );
    } finally {
      setIsRemovingAssistantKey(false);
    }
  };

  const loadAvailableModels = async (
    provider: SupportAssistantProviderKey,
  ): Promise<string[]> => {
    switch (provider) {
      case "openai":
        return (await listOpenAiModels({ organizationId })) as string[];
      case "anthropic":
        return (await listAnthropicModels({ organizationId })) as string[];
      case "google":
        return (await listGoogleModels({ organizationId })) as string[];
      case "minimax":
        return (await listMinimaxModels({ organizationId })) as string[];
      default:
        return [];
    }
  };

  const handleRefreshAssistantModels = async () => {
    setIsLoadingAssistantModels(true);
    const providerLabel = supportAssistantProviderLabels[selectedAssistantProvider];
    try {
      const models = await loadAvailableModels(selectedAssistantProvider);
      setAvailableAssistantModels(Array.isArray(models) ? models : []);
      toast.success("Model list refreshed.");
    } catch (error) {
      console.error("[support-settings] load assistant models", error);
      toast.error(
        error instanceof Error
          ? error.message
          : `Unable to load ${providerLabel} models.`,
      );
    } finally {
      setIsLoadingAssistantModels(false);
    }
  };

  const handleSelectAssistantModel = async (modelId: string) => {
    try {
      await saveSupportOption({
        organizationId,
        key: supportAssistantModelOptionKeyByProvider[selectedAssistantProvider],
        value: modelId,
      });
      toast.success("Assistant model updated.");
    } catch (error) {
      console.error("[support-settings] save assistant model error", error);
      toast.error("Unable to save assistant model. Please try again.");
    }
  };

  const handleSelectAssistantProvider = async (
    provider: SupportAssistantProviderKey,
  ) => {
    const previous = selectedAssistantProvider;
    setSelectedAssistantProvider(provider);
    setAvailableAssistantModels([]);
    try {
      await saveSupportOption({
        organizationId,
        key: supportAssistantProviderKey,
        value: provider,
      });
      toast.success(
        `Assistant provider set to ${supportAssistantProviderLabels[provider]}.`,
      );
    } catch (error) {
      setSelectedAssistantProvider(previous);
      console.error("[support-settings] save assistant provider error", error);
      toast.error("Unable to save assistant provider.");
    }
  };

  const handleSelectEmbeddingProvider = async (provider: "openai" | "google") => {
    const previous = selectedEmbeddingProvider;
    setSelectedEmbeddingProvider(provider);
    try {
      await saveSupportOption({
        organizationId,
        key: supportAssistantEmbeddingProviderKey,
        value: provider,
      });
      toast.success(
        `Embedding provider set to ${supportAssistantProviderLabels[provider]}.`,
      );
    } catch (error) {
      setSelectedEmbeddingProvider(previous);
      console.error("[support-settings] save embedding provider error", error);
      toast.error("Unable to save embedding provider.");
    }
  };

  const handleSaveEmbeddingProviderKey = async () => {
    const trimmed = embeddingKeyInput.trim();
    const providerLabel = supportAssistantProviderLabels[selectedEmbeddingProvider];
    if (!trimmed) {
      toast.error(`Enter your ${providerLabel} API key.`);
      return;
    }
    setIsSavingEmbeddingKey(true);
    try {
      await upsertConnection({
        nodeType: supportAssistantProviderNodeTypes[selectedEmbeddingProvider],
        name: `Support embeddings ${providerLabel}`,
        ownerId: embeddingOwnerKey,
        credentials: trimmed,
        status: "connected",
      });
      setEmbeddingKeyInput("");
      toast.success(`${providerLabel} embedding key saved.`);
    } catch (error) {
      console.error("[support-settings] save embedding key", error);
      toast.error(
        error instanceof Error
          ? error.message
          : `Unable to save ${providerLabel} embedding key.`,
      );
    } finally {
      setIsSavingEmbeddingKey(false);
    }
  };

  const handleRemoveEmbeddingProviderKey = async () => {
    if (!embeddingConnection) {
      return;
    }
    const providerLabel = supportAssistantProviderLabels[selectedEmbeddingProvider];
    setIsRemovingEmbeddingKey(true);
    try {
      await deleteConnection({
        id: (embeddingConnection as any)?._id as Id<"connections">,
      });
      toast.success(`${providerLabel} embedding key removed.`);
    } catch (error) {
      console.error("[support-settings] remove embedding key", error);
      toast.error(
        error instanceof Error
          ? error.message
          : `Unable to remove ${providerLabel} embedding key.`,
      );
    } finally {
      setIsRemovingEmbeddingKey(false);
    }
  };

  const handleToggleAutoRespondToThreads = async (checked: boolean) => {
    if (checked && !isAssistantProviderConnected) {
      const providerLabel =
        supportAssistantProviderLabels[selectedAssistantProvider];
      toast.error(`Connect a ${providerLabel} key before enabling auto responses.`);
      return;
    }
    const previous = isAutoRespondToThreadsEnabled;
    setIsAutoRespondToThreadsEnabled(checked);
    setIsSavingAutoRespondToThreads(true);
    try {
      await saveSupportOption({
        organizationId,
        key: supportAutoRespondToThreadsKey,
        value: checked,
      });
      toast.success(
        checked
          ? "Auto responses enabled. AI will reply 24/7."
          : "Auto responses disabled. Threads will wait for a human agent.",
      );
    } catch (error) {
      setIsAutoRespondToThreadsEnabled(previous);
      console.error("[support-settings] toggle auto respond error", error);
      toast.error("Unable to update auto respond setting.");
    } finally {
      setIsSavingAutoRespondToThreads(false);
    }
  };

  const handleToggleKnowledgeSource = async (
    source: (typeof knowledgeSources)[number],
    nextValue: boolean,
  ) => {
    try {
      await (saveRagSource as any)({
        organizationId,
        sourceId: source._id,
        postTypeSlug: source.postTypeSlug ?? "",
        fields: source.fields as RagField[],
        includeTags: source.includeTags,
        metaFieldKeys: source.metaFieldKeys ?? [],
        displayName: source.displayName ?? undefined,
        isEnabled: nextValue,
        useCustomBaseInstructions: Boolean(source.useCustomBaseInstructions),
        baseInstructions: source.baseInstructions ?? "",
      });
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update knowledge source.",
      );
    }
  };

  const handleDeleteKnowledgeSource = async (sourceId: string) => {
    const confirmed = window.confirm(
      "Remove this indexing configuration? This will stop indexing for the selected post type.",
    );
    if (!confirmed) {
      return;
    }

    try {
      await (deleteRagSource as any)({
        organizationId,
        sourceId: sourceId as any,
      });
      if (knowledgeForm.sourceId === sourceId) {
        handleResetKnowledgeForm();
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to delete knowledge configuration.",
      );
    }
  };

  async function handleReindexKnowledgeSourceRecord(row: {
    postId: string;
    postTypeSlug?: string;
  }) {
    const postTypeSlug =
      row.postTypeSlug ?? selectedKnowledgeSourceRecordsResult?.source?.postTypeSlug;
    if (!postTypeSlug) {
      toast.error("Missing post type for this knowledge source record.");
      return;
    }

    setRecordActionByPostId((previous) => ({
      ...previous,
      [row.postId]: "reindex",
    }));
    try {
      await (triggerRagReindexForPost as any)({
        organizationId,
        postTypeSlug,
        postId: row.postId,
      });
      toast.success("Re-index queued.");
    } catch (error) {
      console.error("[support-settings] reindex knowledge record", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to queue re-index for this record.",
      );
    } finally {
      setRecordActionByPostId((previous) => ({
        ...previous,
        [row.postId]: undefined,
      }));
    }
  }

  async function handleDeleteKnowledgeSourceRecord(row: {
    postId: string;
    postTypeSlug?: string;
    sourceType?: "postType" | "lmsPostType";
  }) {
    const postTypeSlug =
      row.postTypeSlug ?? selectedKnowledgeSourceRecordsResult?.source?.postTypeSlug;
    const sourceType =
      row.sourceType ?? selectedKnowledgeSourceRecordsResult?.source?.sourceType;
    if (!postTypeSlug || !sourceType) {
      toast.error("Missing source metadata for this record.");
      return;
    }

    const confirmed = window.confirm(
      "Delete this record from the RAG index? You can re-index it afterwards.",
    );
    if (!confirmed) {
      return;
    }

    setRecordActionByPostId((previous) => ({
      ...previous,
      [row.postId]: "delete",
    }));
    try {
      await (deleteRagRecordForPost as any)({
        organizationId,
        postTypeSlug,
        postId: row.postId,
        sourceType,
      });
      toast.success("Record deleted from RAG.");
    } catch (error) {
      console.error("[support-settings] delete knowledge record", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to delete this record from RAG.",
      );
    } finally {
      setRecordActionByPostId((previous) => ({
        ...previous,
        [row.postId]: undefined,
      }));
    }
  }

  async function handleBulkReindexKnowledgeSourceRecords(postIds: string[]) {
    const postTypeSlug = selectedKnowledgeSourceRecordsResult?.source?.postTypeSlug;
    const sourceType = selectedKnowledgeSourceRecordsResult?.source?.sourceType;
    if (!postTypeSlug || !sourceType) {
      toast.error("Missing source metadata for bulk re-index.");
      return;
    }

    const normalizedPostIds = Array.from(
      new Set(
        postIds
          .map((postId) => postId.trim())
          .filter((postId) => postId.length > 0),
      ),
    );
    if (normalizedPostIds.length === 0) {
      toast.error("Select at least one record to re-index.");
      return;
    }

    setIsBulkReindexing(true);
    try {
      const result = await (triggerRagReindexForPosts as any)({
        organizationId,
        postTypeSlug,
        sourceType,
        postIds: normalizedPostIds,
      });
      const scheduled =
        typeof result?.scheduled === "number"
          ? result.scheduled
          : normalizedPostIds.length;
      toast.success(`Queued re-index for ${scheduled} records.`);
    } catch (error) {
      console.error("[support-settings] bulk reindex knowledge records", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to queue bulk re-index.",
      );
    } finally {
      setIsBulkReindexing(false);
    }
  }

  async function handleReindexEntireKnowledgeSource() {
    const postTypeSlug = selectedKnowledgeSourceRecordsResult?.source?.postTypeSlug;
    const sourceType = selectedKnowledgeSourceRecordsResult?.source?.sourceType;
    if (!postTypeSlug || !sourceType) {
      toast.error("Missing source metadata for post-type re-index.");
      return;
    }

    setIsBulkReindexing(true);
    try {
      const result = await (triggerRagReindexForPostType as any)({
        organizationId,
        postTypeSlug,
        sourceType,
      });
      const scheduled =
        typeof result?.scheduled === "number" ? result.scheduled : 0;
      toast.success(`Queued re-index for ${scheduled} records in this source.`);
    } catch (error) {
      console.error("[support-settings] reindex full knowledge source", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to queue post-type re-index.",
      );
    } finally {
      setIsBulkReindexing(false);
    }
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const fieldsValue = serializeFieldsOption(formState.fields);
      await Promise.all([
        saveSupportOption({
          organizationId,
          key: supportContactCaptureKey,
          value: formState.requireContact,
        }),
        saveSupportOption({
          organizationId,
          key: supportLoggedInUsersAutocaptureKey,
          value: formState.loggedInUsersAutocapture,
        }),
        saveSupportOption({
          organizationId,
          key: supportContactCaptureFieldsKey,
          value: fieldsValue,
        }),
        saveSupportOption({
          organizationId,
          key: supportIntroHeadlineKey,
          value: formState.introHeadline,
        }),
        saveSupportOption({
          organizationId,
          key: supportWelcomeMessageKey,
          value: formState.welcomeMessage,
        }),
        saveSupportOption({
          organizationId,
          key: supportPrivacyMessageKey,
          value: formState.privacyMessage,
        }),
      ]);
      toast.success("Support chat settings updated.");
    } catch (error) {
      console.error("[support-settings] save error", error);
      toast.error("Unable to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAssistantBaseInstructions = async () => {
    setIsSavingAssistantInstructions(true);
    try {
      await saveSupportOption({
        organizationId,
        key: supportAssistantBaseInstructionsKey,
        value: assistantBaseInstructions.trim(),
      });
      toast.success("Assistant base instructions updated.");
    } catch (error) {
      console.error(
        "[support-settings] save assistant instructions error",
        error,
      );
      toast.error("Unable to save base instructions. Please try again.");
    } finally {
      setIsSavingAssistantInstructions(false);
    }
  };

  const handleSaveAssistantNoKeyBehavior = async () => {
    setIsSavingAssistantNoKeyBehavior(true);
    try {
      await Promise.all([
        saveSupportOption({
          organizationId,
          key: supportAssistantNoKeyBehaviorKey,
          value: assistantNoKeyBehavior,
        }),
        saveSupportOption({
          organizationId,
          key: supportAssistantNoKeyReplyMessageKey,
          value: assistantNoKeyReplyMessage.trim(),
        }),
      ]);
      toast.success("Missing-key behavior updated.");
    } catch (error) {
      console.error(
        "[support-settings] save missing-key behavior error",
        error,
      );
      toast.error("Unable to save missing-key behavior. Please try again.");
    } finally {
      setIsSavingAssistantNoKeyBehavior(false);
    }
  };

  const tabs = [
    { label: "General", value: "general" },
    { label: "Form copy", value: "copy" },
    { label: "Canned responses", value: "responses" },
    { label: "Email intake", value: "email" },
    { label: "AI assistant", value: "assistant" },
    { label: "Knowledge sources", value: "knowledge" },
  ];

  const allowEmailIntake = emailSettings?.allowEmailIntake ?? false;
  const verificationStatus = emailSettings?.verificationStatus ?? "unverified";
  const emailDeliverySource = emailSettings?.deliverySource ?? "unconfigured";
  const emailDeliverySourceLabel =
    emailDeliverySource === "email_plugin"
      ? "Using Email plugin settings"
      : emailDeliverySource === "support_portal_key"
        ? "Using Support fallback sender"
        : "Email delivery not configured";
  const emailDeliverySourceTone =
    emailDeliverySource === "unconfigured" ? "destructive" : "secondary";

  const handleCopyToClipboard = async (value?: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied to clipboard");
    } catch (error) {
      console.error("[support-settings] copy error", error);
      toast.error("Unable to copy. Please try again.");
    }
  };

  const generateWidgetKey = () => {
    if (typeof window === "undefined") return "";
    if (typeof window.crypto?.getRandomValues !== "function") {
      return `support_${Date.now()}`;
    }
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const handleGenerateWidgetKey = async () => {
    setIsGeneratingWidgetKey(true);
    try {
      const nextKey = generateWidgetKey();
      await saveSupportOption({
        organizationId,
        key: supportWidgetKeyOptionKey,
        value: nextKey,
      });
      await handleCopyToClipboard(nextKey);
      toast.success("Widget key generated.");
    } catch (error) {
      console.error("[support-settings] generate widget key error", error);
      toast.error("Unable to generate widget key. Please try again.");
    } finally {
      setIsGeneratingWidgetKey(false);
    }
  };

  const handleSaveAllowedOrigins = async () => {
    setIsSavingWidgetAllowedOrigins(true);
    try {
      const normalized = normalizeAllowedOriginsInput(widgetAllowedOriginsInput);
      await saveSupportOption({
        organizationId,
        key: supportWidgetAllowedOriginsOptionKey,
        value: JSON.stringify(normalized),
      });
      toast.success("Allowed origins updated.");
    } catch (error) {
      console.error("[support-settings] save allowed origins error", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save allowed origins.",
      );
    } finally {
      setIsSavingWidgetAllowedOrigins(false);
    }
  };

  const handleToggleLmsContentAuthoring = async (checked: boolean) => {
    const previous = isLmsContentAuthoringEnabled;
    setIsLmsContentAuthoringEnabled(checked);
    setIsSavingLmsContentAuthoring(true);
    try {
      await saveSupportOption({
        organizationId,
        key: supportLmsContentAuthoringOptionKey,
        value: checked,
      });
      toast.success(
        checked
          ? "LMS AI authoring enabled."
          : "LMS AI authoring disabled.",
      );
    } catch (error) {
      setIsLmsContentAuthoringEnabled(previous);
      console.error("[support-settings] toggle lms content authoring error", error);
      toast.error("Unable to update LMS AI authoring setting.");
    } finally {
      setIsSavingLmsContentAuthoring(false);
    }
  };

  const handleToggleEmailIntake = async (checked: boolean) => {
    setIsEmailTogglePending(true);
    try {
      await saveEmailSettings({
        organizationId,
        allowEmailIntake: checked,
      });
      toast.success(
        checked
          ? "Email intake enabled. New messages will create support threads."
          : "Email intake disabled.",
      );
    } catch (error) {
      console.error("[support-settings] toggle email error", error);
      toast.error("Unable to update email settings. Please try again.");
    } finally {
      setIsEmailTogglePending(false);
    }
  };

  const handleRequestDomain = async () => {
    if (!domainInput.trim()) {
      toast.error("Enter a domain before requesting verification.");
      return;
    }
    setIsDomainMutationPending(true);
    try {
      await beginDomainVerification({
        organizationId,
        customDomain: domainInput.trim().toLowerCase(),
      });
      toast.success(
        "Verification requested. Add the DNS records below to your domain.",
      );
    } catch (error) {
      console.error("[support-settings] domain request error", error);
      toast.error("Unable to start domain verification.");
    } finally {
      setIsDomainMutationPending(false);
    }
  };

  const handleClearDomain = async () => {
    setIsDomainMutationPending(true);
    try {
      await saveEmailSettings({
        organizationId,
        customDomain: null,
        allowEmailIntake: emailSettings?.allowEmailIntake ?? false,
      } as any);
      setDomainInput("");
      toast.success("Custom domain disconnected.");
    } catch (error) {
      console.error("[support-settings] clear domain error", error);
      toast.error("Unable to clear domain. Please try again.");
    } finally {
      setIsDomainMutationPending(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!emailSettings?.defaultAlias) {
      toast.error("Alias not ready yet.");
      return;
    }
    setIsTestingInbound(true);
    try {
      const webhookUrl =
        process.env.NEXT_PUBLIC_SUPPORT_EMAIL_WEBHOOK ??
        "https://determined-crocodile-286.convex.site/api/support/email/inbound";
      const timestamp = Date.now();
      const payload = {
        type: "email.received",
        data: {
          to: [emailSettings.defaultAlias],
          from: "LaunchThat Tester <tester@example.com>",
          subject: `Test inbound email ${new Date(timestamp).toLocaleString()}`,
          text: "This is a simulated inbound email triggered from the admin panel.",
          email_id: `test-email-${timestamp}`,
          message_id: `<test-${timestamp}@support.launchthat.app>`,
        },
      };
      console.log("payload", payload);
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.log("response", response);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "HTTP error");
      }
      toast.success("Test email payload sent to Convex.");
    } catch (error) {
      console.error("[support-settings] test email error", error);
      toast.error("Unable to send test payload. Check console for details.");
    } finally {
      setIsTestingInbound(false);
    }
  };

  return (
    <div className="container space-y-6 py-6 overflow-scroll">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Support settings</h1>
        <p className="text-muted-foreground text-sm">
          Control how the floating assistant behaves and which contact details
          are captured.
        </p>
      </div>
      <Tabs
        value={normalizedTabValue}
        onValueChange={handleTabChange}
        className="space-y-6"
      >
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Public widget key</CardTitle>
              <CardDescription>
                Required for the public support chat endpoints. Keep this
                secret.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-xs">
                Organization ID:{" "}
                <span className="font-mono">{organizationId}</span>
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <Label htmlFor="support-widget-key">Widget key</Label>
                  <Input
                    id="support-widget-key"
                    value={widgetKey ?? ""}
                    readOnly
                    placeholder="Click generate to create a widget key"
                  />
                </div>
                <div className="flex gap-2 sm:pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      void handleCopyToClipboard(widgetKey ?? undefined)
                    }
                    disabled={!widgetKey}
                  >
                    Copy
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleGenerateWidgetKey()}
                    disabled={isGeneratingWidgetKey}
                  >
                    {isGeneratingWidgetKey ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating…
                      </>
                    ) : widgetKey ? (
                      "Rotate"
                    ) : (
                      "Generate"
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                If you rotate this key, any embedded widgets using the old key
                will stop working until updated.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>External website embed</CardTitle>
              <CardDescription>
                Allow third-party origins and copy the native JavaScript embed
                snippet for websites outside this platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="support-widget-allowed-origins">
                  Allowed origins (one per line)
                </Label>
                <Textarea
                  id="support-widget-allowed-origins"
                  value={widgetAllowedOriginsInput}
                  onChange={(event) =>
                    setWidgetAllowedOriginsInput(event.target.value)
                  }
                  placeholder={
                    "https://example.com\nhttps://www.example.com"
                  }
                  rows={4}
                />
                <p className="text-muted-foreground text-xs">
                  Leave empty to allow all origins. Prefer explicit origins in
                  production.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const parsed =
                      widgetAllowedOriginsOption === undefined
                        ? []
                        : parseAllowedOriginsOption(widgetAllowedOriginsOption);
                    setWidgetAllowedOriginsInput(parsed.join("\n"));
                  }}
                  disabled={isSavingWidgetAllowedOrigins}
                >
                  Reset
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleSaveAllowedOrigins()}
                  disabled={isSavingWidgetAllowedOrigins}
                >
                  {isSavingWidgetAllowedOrigins ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save origins"
                  )}
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="support-widget-embed-snippet">
                  Embed snippet
                </Label>
                <Textarea
                  id="support-widget-embed-snippet"
                  value={embedSnippet}
                  readOnly
                  rows={8}
                  placeholder="Generate a widget key to enable embed snippet."
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleCopyToClipboard(embedSnippet)}
                    disabled={!embedSnippet}
                  >
                    Copy snippet
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Contact capture</CardTitle>
                <CardDescription>
                  Require visitors to share contact details before chatting.
                </CardDescription>
              </div>
              <Switch
                checked={formState.requireContact}
                onCheckedChange={(checked) =>
                  setFormState((prev) => ({
                    ...prev,
                    requireContact: checked,
                  }))
                }
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Logged in users autocapture
                  </p>
                  <p className="text-muted-foreground text-xs">
                    When enabled, authenticated users skip the contact form and
                    can start chatting immediately.
                  </p>
                </div>
                <Switch
                  checked={formState.loggedInUsersAutocapture}
                  onCheckedChange={(checked) =>
                    setFormState((prev) => ({
                      ...prev,
                      loggedInUsersAutocapture: checked,
                    }))
                  }
                />
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium">Fields to collect</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    Object.keys(formState.fields) as Array<
                      keyof SupportChatSettings["fields"]
                    >
                  ).map((fieldKey) => (
                    <label
                      key={fieldKey}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={formState.fields[fieldKey]}
                        onCheckedChange={() => handleToggleField(fieldKey)}
                      />
                      {fieldLabels[fieldKey]}
                    </label>
                  ))}
                </div>
                {activeFieldCount === 0 && (
                  <p className="text-destructive text-xs">
                    Enable at least one field so you can capture contact info.
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormState(mergeSupportSettings())}
                  disabled={isSaving}
                >
                  Reset
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleSendTestEmail}
                disabled={!emailSettings?.defaultAlias || isTestingInbound}
              >
                {isTestingInbound ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send test inbound email"
                )}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>When AI key is missing</CardTitle>
              <CardDescription>
                Configure visitor chat behavior when no provider key is connected
                for this organization.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Behavior</Label>
                <Select
                  value={assistantNoKeyBehavior}
                  onValueChange={(value) => {
                    if (
                      value === "do_nothing" ||
                      value === "reply_with_message"
                    ) {
                      setAssistantNoKeyBehavior(value);
                    }
                  }}
                >
                  <SelectTrigger className="w-[22rem]">
                    <SelectValue placeholder="Choose behavior" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="do_nothing">
                      Do nothing (no AI reply)
                    </SelectItem>
                    <SelectItem value="reply_with_message">
                      Reply with a message
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  Use &quot;Do nothing&quot; to keep chat and support threads
                  active without automatic bot responses.
                </p>
              </div>
              {assistantNoKeyBehavior === "reply_with_message" ? (
                <div className="space-y-2">
                  <Label htmlFor="support-assistant-no-key-reply">
                    Fallback reply message
                  </Label>
                  <Textarea
                    id="support-assistant-no-key-reply"
                    value={assistantNoKeyReplyMessage}
                    onChange={(event) =>
                      setAssistantNoKeyReplyMessage(event.target.value)
                    }
                    rows={4}
                    placeholder={defaultSupportAssistantNoKeyReplyMessage}
                  />
                  <p className="text-muted-foreground text-xs">
                    Sent to visitors when the assistant cannot run due to a
                    missing API key.
                  </p>
                </div>
              ) : null}
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAssistantNoKeyBehavior(defaultSupportAssistantNoKeyBehavior);
                    setAssistantNoKeyReplyMessage(
                      defaultSupportAssistantNoKeyReplyMessage,
                    );
                  }}
                  disabled={isSavingAssistantNoKeyBehavior}
                >
                  Reset to default
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveAssistantNoKeyBehavior}
                  disabled={isSavingAssistantNoKeyBehavior}
                >
                  {isSavingAssistantNoKeyBehavior ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save behavior"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Support team roles</CardTitle>
              <CardDescription>
                Assign Support Agent/Admin roles to organization members for
                support queue access.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
                <div className="space-y-1">
                  <Label>Select member</Label>
                  <Popover
                    open={roleUserPickerOpen}
                    onOpenChange={setRoleUserPickerOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {selectedRoleUser
                          ? selectedRoleUser.label
                          : "Search users to assign"}
                        <ChevronsUpDown className="text-muted-foreground ml-2 h-4 w-4 shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[360px] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search users..."
                          value={roleUserSearch}
                          onValueChange={setRoleUserSearch}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {organizationUsersPage === undefined
                              ? "Loading users..."
                              : "No users found."}
                          </CommandEmpty>
                          <CommandGroup
                            heading={
                              roleUserSearch.trim().length > 0
                                ? "Search results"
                                : "Most recent users"
                            }
                          >
                            {assignableMembers.map((member) => (
                              <CommandItem
                                key={member.userId}
                                value={member.searchText}
                                onSelect={() => {
                                  setSelectedRoleUserId(member.userId);
                                  setRoleUserPickerOpen(false);
                                }}
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">
                                    {member.name ?? member.email ?? member.userId}
                                  </p>
                                  {member.email ? (
                                    <p className="text-muted-foreground truncate text-xs">
                                      {member.email}
                                    </p>
                                  ) : null}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-muted-foreground text-xs">
                    Shows most recent 20 users. Type to search.
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Role</Label>
                  <Select
                    value={selectedRoleKey}
                    onValueChange={(value) => {
                      if (value === "support.admin" || value === "support.agent") {
                        setSelectedRoleKey(value);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a support role" />
                    </SelectTrigger>
                    <SelectContent>
                      {supportRoleOptions.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={() => void handleAssignSupportRole()}
                    disabled={!selectedRoleUserId || isAssigningSupportRole}
                  >
                    {isAssigningSupportRole ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Assigning…
                      </>
                    ) : (
                      "Assign role"
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Selected user support role assignments</Label>
                {!selectedRoleUserId ? (
                  <p className="text-muted-foreground text-sm">
                    Select a user to view/remove their support role assignment.
                  </p>
                ) : selectedUserRoleNames === undefined ? (
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading assignments…
                  </div>
                ) : selectedUserSupportRoles.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    This user has no support role assignment.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedUserSupportRoles.map((roleKey) => {
                      const displayName =
                        selectedRoleUser?.name ??
                        selectedRoleUser?.email ??
                        selectedRoleUserId;
                      const roleLabel =
                        roleKey === "support.admin"
                          ? "Support Admin"
                          : "Support Agent";
                      return (
                        <div
                          key={`${selectedRoleUserId}-${roleKey}`}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{displayName}</p>
                            <p className="text-muted-foreground text-xs">
                              {roleLabel} ({roleKey})
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void handleRemoveSupportRole(roleKey)}
                            disabled={removingAssignmentId === roleKey}
                          >
                            {removingAssignmentId === roleKey ? (
                              <>
                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                Removing…
                              </>
                            ) : (
                              "Remove"
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="copy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Form copy</CardTitle>
              <CardDescription>
                Customize the helper text shown above the contact form.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="support-intro">Intro headline</Label>
                  <Input
                    id="support-intro"
                    value={formState.introHeadline}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        introHeadline: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support-welcome">Welcome message</Label>
                  <Input
                    id="support-welcome"
                    value={formState.welcomeMessage}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        welcomeMessage: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="support-privacy">Privacy notice</Label>
                <Textarea
                  id="support-privacy"
                  value={formState.privacyMessage}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      privacyMessage: event.target.value,
                    }))
                  }
                  rows={3}
                />
                <p className="text-muted-foreground text-xs">
                  Displayed below the form to explain how visitor details are
                  used.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormState(mergeSupportSettings())}
                  disabled={isSaving}
                >
                  Reset
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Canned response editor</CardTitle>
              <CardDescription>
                Create reusable responses for support agents. Responses can be
                targeted to chat, email, or both channels.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="support-canned-title">Title</Label>
                  <Input
                    id="support-canned-title"
                    value={cannedResponseForm.title}
                    onChange={(event) =>
                      setCannedResponseForm((prev) => ({
                        ...prev,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Refund policy reply"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support-canned-sort-order">Sort order</Label>
                  <Input
                    id="support-canned-sort-order"
                    inputMode="numeric"
                    value={cannedResponseForm.sortOrder}
                    onChange={(event) =>
                      setCannedResponseForm((prev) => ({
                        ...prev,
                        sortOrder: event.target.value,
                      }))
                    }
                    placeholder="10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="support-canned-body">Response body</Label>
                <Textarea
                  id="support-canned-body"
                  rows={6}
                  value={cannedResponseForm.body}
                  onChange={(event) =>
                    setCannedResponseForm((prev) => ({
                      ...prev,
                      body: event.target.value,
                    }))
                  }
                  placeholder="Hi {{firstName}}, thanks for reaching out..."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Channels</Label>
                  <div className="space-y-2 rounded-md border p-3">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={cannedResponseForm.channels.chat}
                        onCheckedChange={(checked) =>
                          setCannedResponseForm((prev) => ({
                            ...prev,
                            channels: {
                              ...prev.channels,
                              chat: Boolean(checked),
                            },
                          }))
                        }
                      />
                      Chat
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={cannedResponseForm.channels.email}
                        onCheckedChange={(checked) =>
                          setCannedResponseForm((prev) => ({
                            ...prev,
                            channels: {
                              ...prev.channels,
                              email: Boolean(checked),
                            },
                          }))
                        }
                      />
                      Email
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Availability</Label>
                  <div className="flex h-[92px] items-center justify-between rounded-md border px-3">
                    <div>
                      <p className="text-sm font-medium">Active</p>
                      <p className="text-muted-foreground text-xs">
                        Inactive responses stay saved but hidden in composer.
                      </p>
                    </div>
                    <Switch
                      checked={cannedResponseForm.isActive}
                      onCheckedChange={(checked) =>
                        setCannedResponseForm((prev) => ({
                          ...prev,
                          isActive: checked,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetCannedResponseForm}
                  disabled={isSavingCannedResponse}
                >
                  {editingCannedResponseId ? "Cancel edit" : "Clear"}
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleSaveCannedResponse()}
                  disabled={isSavingCannedResponse}
                >
                  {isSavingCannedResponse ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : editingCannedResponseId ? (
                    "Update response"
                  ) : (
                    "Create response"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Saved canned responses</CardTitle>
              <CardDescription>
                Edit, activate/deactivate, or delete existing canned responses.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {cannedResponses === undefined ? (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading canned responses…
                </div>
              ) : cannedResponses.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No canned responses yet. Create your first response above.
                </p>
              ) : (
                cannedResponses.map((row) => {
                  const isBusy = busyCannedResponseId === row._id;
                  return (
                    <div key={row._id} className="space-y-3 rounded-md border p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{row.title}</p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            Updated{" "}
                            {formatDistanceToNow(new Date(row.updatedAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={row.isActive ? "secondary" : "outline"}>
                            {row.isActive ? "Active" : "Inactive"}
                          </Badge>
                          {row.channels.map((channel) => (
                            <Badge key={`${row._id}-${channel}`} variant="outline">
                              {channel === "chat" ? "Chat" : "Email"}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <p className="text-muted-foreground line-clamp-3 text-sm">
                        {row.body}
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-muted-foreground text-xs">
                          Sort order:{" "}
                          {typeof row.sortOrder === "number" ? row.sortOrder : "auto"}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditCannedResponse(row)}
                            disabled={isBusy}
                          >
                            <PencilLine className="mr-2 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              void handleSetCannedResponseActive(row._id, !row.isActive)
                            }
                            disabled={isBusy}
                          >
                            {isBusy ? (
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            ) : null}
                            {row.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void handleDeleteCannedResponse(row._id)}
                            disabled={isBusy}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assistant" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>LMS AI authoring</CardTitle>
                <CardDescription>
                  Enable plan-and-apply authoring for LMS lessons/topics in the
                  chat widget using Puck layouts.
                </CardDescription>
              </div>
              <Switch
                checked={isLmsContentAuthoringEnabled}
                onCheckedChange={handleToggleLmsContentAuthoring}
                disabled={isSavingLmsContentAuthoring}
              />
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">
                When enabled, users on lesson/topic editor pages can ask the
                assistant to draft structured content and apply it into Puck.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Assistant provider connection</CardTitle>
                <CardDescription>
                  Choose the AI provider and store an organization-specific API
                  key. Keys are encrypted inside the integrations vault.
                </CardDescription>
              </div>
              <div className="text-right">
                <Badge
                  variant={isAssistantProviderConnected ? "secondary" : "outline"}
                >
                  {isAssistantProviderConnected ? "Connected" : "Not connected"}
                </Badge>
                {assistantMaskedCredential && (
                  <p className="text-muted-foreground mt-1 font-mono text-xs">
                    {assistantMaskedCredential}
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={selectedAssistantProvider}
                  onValueChange={(value) =>
                    void handleSelectAssistantProvider(
                      value as SupportAssistantProviderKey,
                    )
                  }
                >
                  <SelectTrigger className="w-[18rem]">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {supportAssistantProviders.map((provider) => (
                      <SelectItem key={provider} value={provider}>
                        {supportAssistantProviderLabels[provider]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="support-assistant-key">
                  {supportAssistantProviderLabels[selectedAssistantProvider]} API key
                </Label>
                <Input
                  id="support-assistant-key"
                  type="password"
                  autoComplete="off"
                  value={assistantKeyInput}
                  onChange={(event) => setAssistantKeyInput(event.target.value)}
                  placeholder="Enter provider API key"
                />
                <p className="text-muted-foreground text-xs">
                  The key is scoped to this organization and currently powers{" "}
                  {supportAssistantProviderLabels[selectedAssistantProvider]}.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Assistant model</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={selectedAssistantModelId}
                    onValueChange={handleSelectAssistantModel}
                    disabled={!isAssistantProviderConnected}
                  >
                    <SelectTrigger className="w-[18rem]">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {(availableAssistantModels.length > 0
                        ? availableAssistantModels
                        : [selectedAssistantModelId]
                      ).map((modelId) => (
                        <SelectItem key={modelId} value={modelId}>
                          {modelId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRefreshAssistantModels}
                    disabled={
                      !isAssistantProviderConnected || isLoadingAssistantModels
                    }
                  >
                    {isLoadingAssistantModels ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading…
                      </>
                    ) : (
                      "Refresh models"
                    )}
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">
                  Model options are loaded from{" "}
                  {supportAssistantProviderLabels[selectedAssistantProvider]} using
                  the saved key for this organization.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={handleSaveAssistantKey}
                  disabled={isSavingAssistantKey || !assistantKeyInput.trim()}
                >
                  {isSavingAssistantKey ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save API key"
                  )}
                </Button>
                {isAssistantProviderConnected && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDisconnectAssistantProvider}
                    disabled={isRemovingAssistantKey}
                  >
                    {isRemovingAssistantKey ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Removing…
                      </>
                    ) : (
                      "Remove key"
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          {requiresSecondaryEmbeddingProvider && (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>Secondary embedding provider</CardTitle>
                  <CardDescription>
                    {selectedAssistantProvider === "minimax"
                      ? "MiniMax does not currently provide an embedding model in this integration. Choose OpenAI or Google and save a secondary key for vector indexing and semantic retrieval."
                      : `${supportAssistantProviderLabels[selectedAssistantProvider]} does not provide embeddings in this setup. Choose OpenAI or Google and save a secondary key for vector indexing and semantic retrieval.`}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <Badge
                    variant={isEmbeddingProviderConnected ? "secondary" : "outline"}
                  >
                    {isEmbeddingProviderConnected ? "Connected" : "Not connected"}
                  </Badge>
                  {embeddingMaskedCredential && (
                    <p className="text-muted-foreground mt-1 font-mono text-xs">
                      {embeddingMaskedCredential}
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Embedding provider</Label>
                  <Select
                    value={selectedEmbeddingProvider}
                    onValueChange={(value) =>
                      void handleSelectEmbeddingProvider(
                        value as "openai" | "google",
                      )
                    }
                  >
                    <SelectTrigger className="w-[18rem]">
                      <SelectValue placeholder="Select embedding provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {supportAssistantEmbeddingProviders.map((provider) => (
                        <SelectItem key={provider} value={provider}>
                          {supportAssistantProviderLabels[provider]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support-embedding-key">
                    {supportAssistantProviderLabels[selectedEmbeddingProvider]} API key
                  </Label>
                  <Input
                    id="support-embedding-key"
                    type="password"
                    autoComplete="off"
                    value={embeddingKeyInput}
                    onChange={(event) => setEmbeddingKeyInput(event.target.value)}
                    placeholder="Enter embedding provider API key"
                  />
                  <p className="text-muted-foreground text-xs">
                    This key is only used for embeddings and retrieval (RAG), not
                    chat generation.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    onClick={handleSaveEmbeddingProviderKey}
                    disabled={isSavingEmbeddingKey || !embeddingKeyInput.trim()}
                  >
                    {isSavingEmbeddingKey ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save embedding key"
                    )}
                  </Button>
                  {isEmbeddingProviderConnected && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRemoveEmbeddingProviderKey}
                      disabled={isRemovingEmbeddingKey}
                    >
                      {isRemovingEmbeddingKey ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Removing…
                        </>
                      ) : (
                        "Remove embedding key"
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Auto respond to threads</CardTitle>
                <CardDescription>
                  When enabled, the AI assistant replies automatically 24/7 and
                  the chat status is shown as online.
                </CardDescription>
              </div>
              <Switch
                checked={isAutoRespondToThreadsEnabled}
                onCheckedChange={handleToggleAutoRespondToThreads}
                disabled={
                  isSavingAutoRespondToThreads ||
                  (!isAssistantProviderConnected && !isAutoRespondToThreadsEnabled)
                }
              />
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">
                Turn this off to require a human support agent. When off, the
                visitor status switches to online only when an agent is actively
                present in the conversation.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Email intake</CardTitle>
                <CardDescription>
                  Allow customers to email a shared inbox and have those
                  messages appear in the support dashboard.
                </CardDescription>
              </div>
              <Switch
                checked={allowEmailIntake}
                onCheckedChange={handleToggleEmailIntake}
                disabled={emailSettings === undefined || isEmailTogglePending}
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email delivery source</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={emailDeliverySourceTone}>
                    {emailDeliverySourceLabel}
                  </Badge>
                  {emailSettings?.emailPluginConfigured &&
                    !emailSettings?.emailPluginEnabled && (
                      <Badge variant="outline">Email plugin exists but disabled</Badge>
                    )}
                </div>
                <p className="text-muted-foreground text-xs">
                  Support tries to use configured Email plugin settings first. If
                  not enabled, it falls back to platform email delivery when
                  available.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant={allowEmailIntake ? "default" : "secondary"}
                  onClick={() => handleToggleEmailIntake(true)}
                  disabled={isEmailTogglePending}
                >
                  Enable email intake
                </Button>
                <Button
                  type="button"
                  variant={allowEmailIntake ? "outline" : "default"}
                  onClick={() => handleToggleEmailIntake(false)}
                  disabled={isEmailTogglePending}
                >
                  Disable email intake
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Default alias</Label>
                <div className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <span className="font-mono">
                    {emailSettings?.defaultAlias ?? "loading…"}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      handleCopyToClipboard(emailSettings?.defaultAlias)
                    }
                    disabled={!emailSettings?.defaultAlias}
                  >
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">Copy alias</span>
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">
                  Share this address or set up a forwarder to capture messages
                  without connecting a custom domain.
                </p>
              </div>
              <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
                <span>Deliverability status:</span>
                <Badge variant="outline">{verificationStatus}</Badge>
                {(emailSettings?.customDomain ?? null) && (
                  <Badge variant="secondary">Custom domain active</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle>Connect a custom sending domain</CardTitle>
              <CardDescription>
                Authenticate your brand&apos;s domain so replies are sent from
                trusted email servers. We use Resend to provision DNS records.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="support-domain">Domain</Label>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Input
                    id="support-domain"
                    value={domainInput}
                    onChange={(event) => setDomainInput(event.target.value)}
                    placeholder="support.yourdomain.com"
                    disabled={isDomainMutationPending}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={handleRequestDomain}
                      disabled={
                        !domainInput.trim() ||
                        isDomainMutationPending ||
                        emailSettings === undefined
                      }
                    >
                      {isDomainMutationPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Connecting…
                        </>
                      ) : (
                        "Connect domain"
                      )}
                    </Button>
                    {emailSettings?.customDomain && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleClearDomain}
                        disabled={isDomainMutationPending}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {emailSettings?.dnsRecords?.length ? (
                <div className="space-y-2">
                  <Label>DNS records</Label>
                  <div className="space-y-3 rounded-md border p-3 text-sm">
                    {emailSettings.dnsRecords.map(
                      (record: {
                        type: string;
                        host: string;
                        value: string;
                      }) => (
                        <div
                          key={`${record.type}-${record.host}`}
                          className="space-y-1 rounded-md border border-dashed p-3"
                        >
                          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs uppercase">
                            <span>{record.type}</span>
                            <span>record</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-muted-foreground">Host:</span>
                            <code className="font-mono text-xs">
                              {record.host}
                            </code>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopyToClipboard(record.host)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-muted-foreground">
                              Value:
                            </span>
                            <code className="font-mono text-xs">
                              {record.value}
                            </code>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleCopyToClipboard(record.value)
                              }
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Add these records to your DNS provider, then return to this
                    page to confirm once propagation finishes.
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  DNS records will appear here once you connect a domain.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assistant prompt</CardTitle>
              <CardDescription>
                Global base instructions used when no post-type-specific prompt
                override is active.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="support-assistant-base-instructions">
                  Global base instructions
                </Label>
                <Textarea
                  id="support-assistant-base-instructions"
                  value={assistantBaseInstructions}
                  onChange={(event) =>
                    setAssistantBaseInstructions(event.target.value)
                  }
                  rows={6}
                  placeholder={defaultSupportAssistantBaseInstructions}
                />
                <p className="text-muted-foreground text-xs">
                  Tip: Add grounding rules like “only use the transcript” and a
                  consistent output format (overview, bullets, action steps).
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setAssistantBaseInstructions(
                      defaultSupportAssistantBaseInstructions,
                    )
                  }
                  disabled={isSavingAssistantInstructions}
                >
                  Reset to default
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveAssistantBaseInstructions}
                  disabled={isSavingAssistantInstructions}
                >
                  {isSavingAssistantInstructions ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Knowledge sources</CardTitle>
              <CardDescription>
                Control which post types should be indexed for RAG so the agent
                can answer questions about your lessons, articles, or docs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedKnowledgeSourceId && (
                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">
                        {selectedKnowledgeSourceLabel}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Records currently tracked for this post type in the
                        indexing system.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isBulkReindexing}
                        onClick={handleReindexEntireKnowledgeSource}
                      >
                        {isBulkReindexing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Re-index all records
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCloseKnowledgeSourceDetail}
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to sources
                      </Button>
                    </div>
                  </div>
                  {selectedKnowledgeSourceRecordsResult === undefined ? (
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading tracked records…
                    </div>
                  ) : (
                    <EntityList
                      data={knowledgeSourceRecordRows}
                      columns={knowledgeSourceRecordColumns}
                      isLoading={false}
                      enableFooter={false}
                      enableSearch
                      enableRowSelection
                      getRowId={(row) => row.postId}
                      bulkActions={({ selectedItems, clearSelection }) => (
                        <>
                          <div className="text-muted-foreground text-sm">
                            {selectedItems.length} selected
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="ml-auto"
                            disabled={isBulkReindexing || selectedItems.length === 0}
                            onClick={async () => {
                              await handleBulkReindexKnowledgeSourceRecords(
                                selectedItems.map((item) => item.postId),
                              );
                              clearSelection();
                            }}
                          >
                            {isBulkReindexing ? (
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="mr-2 h-3.5 w-3.5" />
                            )}
                            Re-index selected
                          </Button>
                        </>
                      )}
                      defaultViewMode="list"
                      viewModes={["list"]}
                      emptyState={
                        <div className="text-muted-foreground py-6 text-center text-sm">
                          No records tracked yet for this source.
                        </div>
                      }
                    />
                  )}
                </div>
              )}
              {knowledgeSourcesLoading ? (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading post types…
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">Indexed sources</p>
                        <p className="text-muted-foreground text-xs">
                          Enable the post types that should feed helpdesk
                          answers.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleResetKnowledgeForm}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        New configuration
                      </Button>
                    </div>
                    {knowledgeSources.length ? (
                      <div className="space-y-3">
                        {knowledgeSources.map((source, index) => (
                          <div
                            key={(source as any)?._id ?? `source-${index}`}
                            className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${
                              selectedKnowledgeSourceId &&
                              String(source._id) === selectedKnowledgeSourceId
                                ? "border-primary"
                                : ""
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium">
                                  {postTypeLabelMap.get(source.postTypeSlug) ??
                                    source.postTypeSlug}
                                </p>
                                {source.useCustomBaseInstructions ? (
                                  <Badge variant="secondary">
                                    Custom prompt
                                  </Badge>
                                ) : null}
                              </div>
                              <p className="text-muted-foreground text-xs">
                                Fields: {source.fields.join(", ")}
                                {source.includeTags ? ", tags" : ""}
                                {source.metaFieldKeys?.length
                                  ? `, meta: ${source.metaFieldKeys.join(", ")}`
                                  : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleOpenKnowledgeSourceDetail(
                                    source._id as string,
                                  )
                                }
                              >
                                View records
                              </Button>
                              <Switch
                                checked={source.isEnabled}
                                onCheckedChange={(checked) =>
                                  handleToggleKnowledgeSource(
                                    source,
                                    Boolean(checked),
                                  )
                                }
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() =>
                                  handleSelectKnowledgeSource(source)
                                }
                              >
                                <PencilLine className="h-4 w-4" />
                                <span className="sr-only">Edit source</span>
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() =>
                                  handleDeleteKnowledgeSource(
                                    source._id as string,
                                  )
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Remove source</span>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        No post types are being indexed yet. Add a configuration
                        below to start training the agent with your own content.
                      </p>
                    )}
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <div>
                      <p className="text-sm font-medium">Editor</p>
                      <p className="text-muted-foreground text-xs">
                        Pick a post type, choose the content fields to include,
                        and optionally add tags or meta fields for richer
                        context.
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="rag-post-type">Post type</Label>
                        <Select
                          value={knowledgeForm.postTypeSlug ?? ""}
                          onValueChange={(value) =>
                            setKnowledgeForm((prev) => ({
                              ...prev,
                              postTypeSlug: value,
                              additionalMetaKeys:
                                value === "lessons"
                                  ? "vimeoTranscript,vimeoTranscriptVtt"
                                  : prev.additionalMetaKeys,
                            }))
                          }
                        >
                          <SelectTrigger id="rag-post-type">
                            <SelectValue placeholder="Select a post type" />
                          </SelectTrigger>
                          <SelectContent>
                            {postTypeOptions.length === 0 ? (
                              <SelectItem value="" disabled>
                                No post types available
                              </SelectItem>
                            ) : (
                              postTypeOptions.map((type) => (
                                <SelectItem
                                  key={(type._id ?? type.slug ?? "") as string}
                                  value={(type.slug ?? "") as string}
                                >
                                  {type.name ?? type.slug ?? "Unknown type"}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rag-display-name">Display name</Label>
                        <Input
                          id="rag-display-name"
                          placeholder="Internal label"
                          value={knowledgeForm.displayName}
                          onChange={(event) =>
                            setKnowledgeForm((prev) => ({
                              ...prev,
                              displayName: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={knowledgeForm.isEnabled}
                        onCheckedChange={(checked) =>
                          setKnowledgeForm((prev) => ({
                            ...prev,
                            isEnabled: Boolean(checked),
                          }))
                        }
                      />
                      <span className="text-sm">Enable indexing</span>
                    </div>
                    <div className="space-y-2">
                      <Label>Content fields</Label>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {(Object.keys(ragFieldLabels) as RagField[]).map(
                          (field) => (
                            <label
                              key={field}
                              className="flex items-center gap-2 rounded-md border p-2 text-sm"
                            >
                              <Checkbox
                                checked={knowledgeForm.fields[field]}
                                onCheckedChange={() =>
                                  handleToggleRagField(field)
                                }
                              />
                              {ragFieldLabels[field]}
                            </label>
                          ),
                        )}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={knowledgeForm.includeTags}
                        onCheckedChange={(checked) =>
                          setKnowledgeForm((prev) => ({
                            ...prev,
                            includeTags: Boolean(checked),
                          }))
                        }
                      />
                      Include post tags in the search prompt
                    </label>
                    <div className="space-y-3 rounded-md border p-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            Post-type prompt override
                          </p>
                          <p className="text-muted-foreground text-xs">
                            If enabled, the assistant will use this prompt when
                            answering questions on pages for this post type.
                            Otherwise, it uses the global base instructions.
                          </p>
                        </div>
                        <Switch
                          checked={knowledgeForm.useCustomBaseInstructions}
                          onCheckedChange={(checked) =>
                            setKnowledgeForm((prev) => ({
                              ...prev,
                              useCustomBaseInstructions: Boolean(checked),
                            }))
                          }
                        />
                      </div>
                      {knowledgeForm.useCustomBaseInstructions ? (
                        <div className="space-y-2">
                          <Label htmlFor="rag-base-instructions">
                            Base instructions for this post type
                          </Label>
                          <Textarea
                            id="rag-base-instructions"
                            value={knowledgeForm.baseInstructions}
                            onChange={(event) =>
                              setKnowledgeForm((prev) => ({
                                ...prev,
                                baseInstructions: event.target.value,
                              }))
                            }
                            rows={6}
                            placeholder={assistantBaseInstructions}
                          />
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-xs">
                          Using the global base instructions for this post type.
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Custom fields to include</Label>
                      {knowledgeForm.postTypeSlug ? (
                        metaFieldOptions.length ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {metaFieldOptions.map((field) => (
                              <label
                                key={field.key}
                                className="flex items-center gap-2 rounded-md border p-2 text-sm"
                              >
                                <Checkbox
                                  checked={knowledgeForm.metaFieldKeys.includes(
                                    field.key,
                                  )}
                                  onCheckedChange={() =>
                                    handleToggleMetaField(field.key)
                                  }
                                />
                                {field.label}
                              </label>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            This post type does not have custom fields yet.
                          </p>
                        )
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          Select a post type to load its custom fields.
                        </p>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="rag-meta-fields-manual">
                          Additional meta keys (comma separated)
                        </Label>
                        <Input
                          id="rag-meta-fields-manual"
                          placeholder="e.g. topic, difficulty"
                          value={knowledgeForm.additionalMetaKeys}
                          onChange={(event) =>
                            setKnowledgeForm((prev) => ({
                              ...prev,
                              additionalMetaKeys: event.target.value,
                            }))
                          }
                        />
                        <p className="text-muted-foreground text-xs">
                          Optional. Provide extra meta keys to include
                          structured data when no custom field exists.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={handleSaveKnowledgeSource}
                        disabled={
                          isSavingSource ||
                          !knowledgeForm.postTypeSlug ||
                          postTypeOptions.length === 0
                        }
                      >
                        {isSavingSource ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving…
                          </>
                        ) : knowledgeForm.sourceId ? (
                          "Save changes"
                        ) : (
                          "Add source"
                        )}
                      </Button>
                      {knowledgeForm.sourceId && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleResetKnowledgeForm}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
