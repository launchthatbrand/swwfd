import type { GenericId as Id } from "convex/values";
import type { PluginDefinition } from "@swwfd/plugin-core";
import { createElement } from "react";
import {
  ADMIN_ARCHIVE_CONTENT_AFTER,
  ADMIN_ARCHIVE_CONTENT_BEFORE,
  ADMIN_ARCHIVE_CONTENT_SUPPRESS,
  ADMIN_ARCHIVE_HEADER_BEFORE,
  ADMIN_ARCHIVE_HEADER_SUPPRESS,
  ADMIN_PLUGIN_SETTINGS_HEADER_BEFORE,
} from "@swwfd/plugin-core/hookSlots";

import { registerSupportAdminMetaBoxes } from "./admin/metaBoxes";
import { TriggerRulesMetaBox } from "./admin/metaBoxes/TriggerRulesMetaBox";
import { AnalyticsView } from "./admin/views/AnalyticsView";
import { DashboardView } from "./admin/views/DashboardView";
import {
  SupportDashboardWidgetCard,
  type DashboardWidgetRenderProps,
} from "./admin/views/DashboardWidgetCard";
import { SettingsView } from "./admin/views/SettingsView";
import {
  injectSupportArchiveContent,
  injectSupportArchiveContentBefore,
  injectSupportArchiveHeader,
  injectSupportSettingsHeader,
  suppressSupportContent,
  suppressSupportHeader,
} from "./supportHooks";

export const PLUGIN_ID = "support" as const;
export type PluginId = typeof PLUGIN_ID;
const ADMIN_DASHBOARD_WIDGETS_FILTER = "admin.dashboard.widgets.filter";

type AdminDashboardWidgetDefinition = {
  id: string;
  pluginId?: string;
  featureKey?: string;
  title: string;
  description?: string;
  defaultVisible?: boolean;
  defaultOrder?: number;
  defaultSize?: "sm" | "md" | "lg";
  render: (props: DashboardWidgetRenderProps) => unknown;
};

export type CreateSupportPluginDefinitionOptions = Record<string, never>;

const defaultOptions: CreateSupportPluginDefinitionOptions = {};

const SUPPORT_POST_TABLES = [
  "launchthat_support:posts",
  "launchthat_support:postsMeta",
] as const;

const SUPPORT_COMPONENT_NAME = "launchthat_support" as const;

const buildSupportNavHref = (slug: string) => {
  switch (slug) {
    case "conversations":
      return "/admin/edit?post_type=supportconversations";
    case "articles":
      return "/admin/edit?post_type=helpdeskarticles";
    case "analytics":
      return "/admin/edit?plugin=support&page=analytics";
    case "settings":
      return "/admin/edit?plugin=support&page=settings";
    default:
      return "/admin/edit?plugin=support&page=dashboard";
  }
};

const coerceOrgId = (value?: string): Id<"organizations"> | undefined =>
  value ? (value as Id<"organizations">) : undefined;

const addSupportDashboardWidget = (
  value: unknown,
): AdminDashboardWidgetDefinition[] => {
  const existing = Array.isArray(value)
    ? (value as AdminDashboardWidgetDefinition[])
    : [];
  if (existing.some((widget) => widget.id === "support.admin-overview")) {
    return existing;
  }
  return [
    ...existing,
    {
      id: "support.admin-overview",
      pluginId: PLUGIN_ID,
      featureKey: "support",
      title: "Support",
      description: "Live support conversation status and triage.",
      defaultVisible: true,
      defaultOrder: 40,
      defaultSize: "md",
      render: (props: DashboardWidgetRenderProps) =>
        createElement(SupportDashboardWidgetCard, props),
    },
  ];
};

export const createSupportPluginDefinition = (
  _options: CreateSupportPluginDefinitionOptions = defaultOptions,
): PluginDefinition => ({
  id: PLUGIN_ID,
  name: "Support",
  description: "Unified helpdesk with optional AI assistance.",
  longDescription:
    "Adds the full support toolkit: knowledge articles, trigger phrases, the customer chat bubble, and the portal-side conversations dashboard. AI responses can be enabled on top of the manual workflow when desired.",
  features: [
    "Floating chat widget with trigger-word routing",
    "Org-scoped helpdesk article post type",
    "Article-level trigger phrases with priority controls",
    "Manual conversation dashboard for agents",
    "Optional AI-generated replies that read your articles",
    "Plugin-managed lifecycle & settings pages",
  ],
  postTypes: [
    {
      name: "Helpdesk Articles",
      slug: "helpdeskarticles",
      description:
        "Long-form answers and docs that can power the support widget.",
      isPublic: false,
      includeTimestamps: true,
      enableApi: true,
      supports: {
        title: true,
        editor: true,
        excerpt: true,
        attachments: true,
        featuredImage: true,
        customFields: true,
        postMeta: true,
        taxonomy: true,
      },
      rewrite: {
        hasArchive: false,
        singleSlug: "helpdesk-article",
        withFront: true,
        feeds: false,
        pages: true,
      },
      adminMenu: {
        enabled: true,
        label: "Helpdesk Articles",
        icon: "BookOpen",
        position: 61,
      },
      storageKind: "component",
      storageTables: [...SUPPORT_POST_TABLES],
      storageComponent: SUPPORT_COMPONENT_NAME,
      metaBoxes: [
        {
          id: "helpdesk-trigger-meta",
          title: "Trigger Rules",
          description:
            "Configure how this article should be suggested when visitors ask questions.",
          location: "sidebar",
          priority: 10,
          fieldKeys: [
            "trigger_is_active",
            "trigger_match_mode",
            "trigger_priority",
            "trigger_phrases",
          ],
          rendererKey: "support.helpdesk.triggerRules",
        },
      ],
      metaBoxRenderers: {
        "support.helpdesk.triggerRules": TriggerRulesMetaBox,
      },
      singleView: {
        basePath: "/admin/support/helpdesk-articles",
        defaultTab: "edit",
        tabs: [
          {
            id: "edit",
            slug: "edit",
            label: "Edit",
            description: "Edit article content, slug, and SEO settings.",
            usesDefaultEditor: true,
            useDefaultMainMetaBoxes: false,
            useDefaultSidebarMetaBoxes: true,
          },
          {
            id: "trigger-rules",
            slug: "trigger-rules",
            label: "Trigger Rules",
            description: "Tune the trigger phrases and match behavior.",
            usesDefaultEditor: true,
            showGeneralPanel: false,
            showCustomFieldsPanel: false,
            mainMetaBoxIds: ["helpdesk-trigger-meta"],
            useDefaultSidebarMetaBoxes: true,
          },
        ],
      },
    },
    {
      name: "Support Conversations",
      slug: "supportconversations",
      description: "Conversation threads captured from the support widget.",
      isPublic: false,
      includeTimestamps: true,
      enableApi: true,
      supports: {
        title: true,
        customFields: true,
      },
      adminMenu: {
        enabled: true,
        label: "Conversations",
        icon: "MessageSquare",
        position: 62,
        parent: "plugin:support",
      },
      storageKind: "component",
      storageTables: [...SUPPORT_POST_TABLES],
      storageComponent: SUPPORT_COMPONENT_NAME,
      singleView: {
        basePath: "/admin/edit",
        defaultTab: "edit",
        tabs: [
          {
            id: "edit",
            slug: "edit",
            label: "Edit",
            description: "Edit conversation details.",
            usesDefaultEditor: true,
            showGeneralPanel: true,
            showCustomFieldsPanel: true,
            useDefaultMainMetaBoxes: true,
            useDefaultSidebarMetaBoxes: true,
          },
        ],
      },
      adminArchiveView: {
        showSidebar: false,
      },
    },
    {
      name: "Support Threads",
      slug: "supportthreads",
      description: "Individual messages inside a conversation thread.",
      isPublic: false,
      includeTimestamps: true,
      enableApi: true,
      supports: {
        editor: true,
        customFields: true,
      },
      adminMenu: {
        enabled: false,
      },
      storageKind: "component",
      storageTables: [...SUPPORT_POST_TABLES],
      storageComponent: SUPPORT_COMPONENT_NAME,
    },
    {
      name: "Support RAG Sources",
      slug: "supportragsources",
      description: "Knowledge source registry for AI answer generation.",
      isPublic: false,
      includeTimestamps: true,
      enableApi: true,
      supports: {
        customFields: true,
      },
      adminMenu: {
        enabled: false,
      },
      storageKind: "component",
      storageTables: [...SUPPORT_POST_TABLES],
      storageComponent: SUPPORT_COMPONENT_NAME,
    },
    {
      name: "Support Presence",
      slug: "supportpresence",
      description: "Agent presence records for conversations.",
      isPublic: false,
      includeTimestamps: true,
      enableApi: true,
      supports: {
        title: true,
        customFields: true,
        postMeta: true,
      },
      adminMenu: {
        enabled: false,
      },
      storageKind: "component",
      storageTables: [...SUPPORT_POST_TABLES],
      storageComponent: SUPPORT_COMPONENT_NAME,
    },
    {
      name: "Support Email Settings",
      slug: "supportemailsettings",
      description: "Email intake and DNS configuration for support.",
      isPublic: false,
      includeTimestamps: true,
      enableApi: true,
      supports: {
        title: true,
        customFields: true,
        postMeta: true,
      },
      adminMenu: {
        enabled: false,
      },
      storageKind: "component",
      storageTables: [...SUPPORT_POST_TABLES],
      storageComponent: SUPPORT_COMPONENT_NAME,
    },
    {
      name: "Support Canned Responses",
      slug: "supportcannedresponses",
      description: "Reusable canned responses for agents.",
      isPublic: false,
      includeTimestamps: true,
      enableApi: true,
      supports: {
        title: true,
        editor: true,
        customFields: true,
        postMeta: true,
      },
      adminMenu: {
        enabled: false,
      },
      storageKind: "component",
      storageTables: [...SUPPORT_POST_TABLES],
      storageComponent: SUPPORT_COMPONENT_NAME,
    },
  ],
  settingsPages: [
    {
      id: "support-dashboard",
      slug: "dashboard",
      label: "Dashboard",
      description: "See key metrics and quick links for support operations.",
      render: (props) => {
        const organizationId = coerceOrgId(props.organizationId);
        if (!organizationId) {
          return null;
        }
        return createElement(DashboardView, {
          organizationId,
          buildNavHref: buildSupportNavHref,
        });
      },
    },
    {
      id: "support-analytics",
      slug: "analytics",
      label: "Analytics",
      description: "Support analytics overview.",
      render: (props) =>
        createElement(AnalyticsView, {
          organizationId: coerceOrgId(props.organizationId),
        }),
    },
    {
      id: "support-settings",
      slug: "settings",
      label: "Support Settings",
      description: "Configure support chat preferences.",
      render: (props) => {
        const organizationId = coerceOrgId(props.organizationId);
        if (!organizationId) {
          return null;
        }
        return createElement(SettingsView, { organizationId });
      },
    },
  ],
  activation: {
    optionKey: `plugin_${PLUGIN_ID}_enabled`,
    optionType: "site",
    defaultEnabled: false,
  },
  admin: {
    bootstrap: registerSupportAdminMetaBoxes,
  },
  adminMenus: [
    {
      label: "Support",
      slug: "support",
      icon: "MessageCircle",
      position: 60,
      group: "support",
    },
  ],
  hooks: {
    filters: [
      {
        hook: ADMIN_ARCHIVE_HEADER_BEFORE,
        priority: 10,
        acceptedArgs: 2,
        callback: injectSupportArchiveHeader,
      },
      {
        hook: ADMIN_ARCHIVE_HEADER_SUPPRESS,
        priority: 10,
        acceptedArgs: 2,
        callback: suppressSupportHeader,
      },
      {
        hook: ADMIN_ARCHIVE_CONTENT_SUPPRESS,
        priority: 10,
        acceptedArgs: 2,
        callback: suppressSupportContent,
      },
      {
        hook: ADMIN_ARCHIVE_CONTENT_BEFORE,
        priority: 5,
        acceptedArgs: 2,
        callback: injectSupportArchiveContentBefore,
      },
      {
        hook: ADMIN_ARCHIVE_CONTENT_AFTER,
        priority: 10,
        acceptedArgs: 2,
        callback: injectSupportArchiveContent,
      },
      {
        hook: ADMIN_PLUGIN_SETTINGS_HEADER_BEFORE,
        priority: 10,
        acceptedArgs: 2,
        callback: injectSupportSettingsHeader,
      },
      {
        hook: ADMIN_DASHBOARD_WIDGETS_FILTER,
        priority: 20,
        acceptedArgs: 2,
        callback: addSupportDashboardWidget,
      },
    ],
  },
});

export const supportPlugin: PluginDefinition = createSupportPluginDefinition();
