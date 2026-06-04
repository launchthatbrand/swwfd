import type { GenericId as Id } from "convex/values";
import type { ReactNode } from "react";

import { ScrollArea, ScrollBar } from "@launchthatapp/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@launchthatapp/ui/tabs";

import { SupportSystem } from "./admin/SupportSystem";

interface SupportTab {
  value: string;
  label: string;
  href: string;
}

type ArchiveLayoutContext = "default" | "plugin" | "content-only";
type PluginMenuItem = { id: string; label: string; href: string };
type PluginMenuMap = Record<string, PluginMenuItem[]>;

type SupportPluginMenuItem = { id: string; label: string; href: string };
type SupportPluginMenuMap = Record<string, SupportPluginMenuItem[]>;

const SUPPORT_PLUGIN_ID = "support";

const buildTabsFromMenu = (items?: PluginMenuItem[]): SupportTab[] => {
  if (!items?.length) {
    return [];
  }
  return items.map((item) => ({
    value: item.id,
    label: item.label,
    href: item.href,
  }));
};

const POST_TYPE_TO_TAB: Record<string, string> = {
  helpdeskarticles: "helpdeskarticles",
  supportconversations: "supportconversations",
  supportthreads: "supportthreads",
  supportragsources: "supportragsources",
};

interface SupportArchiveHeaderProps {
  activeTab?: string;
  tabs?: SupportTab[];
}

const getValidTabValue = (value: string | undefined, tabs: SupportTab[]) => {
  if (!value) return undefined;
  return tabs.some((tab) => tab.value === value) ? value : undefined;
};

const SUPPORT_ARCHIVE_TABS: SupportTab[] = [
  {
    value: "helpdeskarticles",
    label: "Helpdesk Articles",
    href: "/admin/edit?post_type=helpdeskarticles",
  },
  {
    value: "supportconversations",
    label: "Conversations",
    href: "/admin/edit?post_type=supportconversations",
  },
  {
    value: "supportthreads",
    label: "Threads",
    href: "/admin/edit?post_type=supportthreads",
  },
  {
    value: "supportragsources",
    label: "RAG Sources",
    href: "/admin/edit?post_type=supportragsources",
  },
];

export const SupportArchiveHeader = ({
  activeTab,
  tabs: providedTabs,
}: SupportArchiveHeaderProps) => {
  const tabs = providedTabs?.length ? providedTabs : SUPPORT_ARCHIVE_TABS;
  const resolvedValue =
    getValidTabValue(activeTab, tabs) ?? tabs[0]?.value ?? "products";

  return (
    <div className="bg-muted flex w-full items-center justify-between gap-6">
      <Tabs value={resolvedValue}>
        <ScrollArea className="w-full whitespace-nowrap">
          <TabsList className="rounded-none p-0 pt-2">
            {tabs.map((tab: SupportTab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                asChild
                className="data-[state=active]:border-b-primary data-[state=active]:border-b"
              >
                <a href={tab.href} className="h-full rounded-xs data-[state=active]:border-b-2">
                  {tab.label}
                </a>
              </TabsTrigger>
            ))}
          </TabsList>
          <ScrollBar
            orientation="horizontal"
            className="primary flex h-[5px]"
            style={{ "--border": "#bababa" } as React.CSSProperties}
          />
        </ScrollArea>
      </Tabs>
    </div>
  );
};

const SupportSettingsHeader = ({
  activeTab,
  tabs,
}: {
  activeTab?: string;
  tabs: SupportTab[];
}) => {
  const resolvedValue =
    (activeTab && tabs.some((tab) => tab.value === activeTab)
      ? activeTab
      : tabs[0]?.value) ?? "dashboard";

  return (
    <div className="bg-muted flex w-full flex-col gap-6">
      <Tabs value={resolvedValue}>
        <ScrollArea className="w-full whitespace-nowrap">
          <TabsList className="rounded-none p-0 pt-2">
            {tabs.map((tab: SupportTab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                asChild
                className="data-[state=active]:border-b-primary data-[state=active]:border-b"
              >
                <a href={tab.href} className="h-full rounded-xs data-[state=active]:border-b-2">
                  {tab.label}
                </a>
              </TabsTrigger>
            ))}
          </TabsList>
          <ScrollBar
            orientation="horizontal"
            className="primary flex h-[5px]"
            style={{ "--border": "#bababa" } as React.CSSProperties}
          />
        </ScrollArea>
      </Tabs>
    </div>
  );
};

export const injectSupportArchiveHeader = (
  value: unknown,
  context?: unknown,
): ReactNode[] => {
  const nodes = Array.isArray(value) ? [...(value as ReactNode[])] : [];
  const typedContext = context as
    | {
        postType?: string;
        layout?: ArchiveLayoutContext;
        pluginMenus?: PluginMenuMap;
      }
    | undefined;

  const SUPPORTED_ARCHIVE_POST_TYPES = new Set([
    "helpdeskarticles",
    "supportconversations",
    "supportthreads",
    "supportragsources",
  ]);

  const layout = typedContext?.layout ?? "default";
  const shouldRender =
    layout !== "content-only" &&
    !!typedContext?.postType &&
    SUPPORTED_ARCHIVE_POST_TYPES.has(typedContext.postType);

  if (!shouldRender) {
    return nodes;
  }

  const menuTabs = buildTabsFromMenu(
    typedContext?.pluginMenus?.[SUPPORT_PLUGIN_ID],
  );
  const desiredTabId = typedContext?.postType
    ? `postType:${typedContext.postType}`
    : undefined;
  const hasMenuMatch = desiredTabId
    ? menuTabs.some((tab) => tab.value === desiredTabId)
    : false;
  const activeTab = hasMenuMatch
    ? desiredTabId
    : POST_TYPE_TO_TAB[typedContext?.postType ?? ""];

  return [
    ...nodes,
    <SupportArchiveHeader
      key="support-archive-header"
      activeTab={activeTab}
      tabs={menuTabs.length > 0 ? menuTabs : undefined}
    />,
  ];
};

export const injectSupportSettingsHeader = (
  value: unknown,
  context?: unknown,
): ReactNode[] => {
  const nodes = Array.isArray(value) ? [...(value as ReactNode[])] : [];
  const ctx = context as
    | {
        pluginId?: string;
        pageSlug?: string;
        pluginMenus?: PluginMenuMap;
      }
    | undefined;

  if (ctx?.pluginId !== SUPPORT_PLUGIN_ID) {
    return nodes;
  }

  const menuTabs = buildTabsFromMenu(ctx.pluginMenus?.[SUPPORT_PLUGIN_ID]);
  if (menuTabs.length === 0) {
    return nodes;
  }

  const normalizedPage = ctx.pageSlug?.toLowerCase() ?? "";
  const matchedTab =
    menuTabs.find((tab) =>
      tab.href.toLowerCase().includes(`page=${normalizedPage}`),
    ) ?? menuTabs.find((tab) => tab.value === normalizedPage);

  return [
    ...nodes,
    <SupportSettingsHeader
      key="support-settings-header"
      activeTab={matchedTab?.value}
      tabs={menuTabs}
    />,
  ];
};

export const suppressSupportHeader = (
  value: unknown,
  context?: unknown,
): boolean => {
  const ctx = context as { postType?: string } | undefined;
  if (ctx?.postType === "supportconversations") {
    return true;
  }
  return Boolean(value);
};

export const suppressSupportContent = (
  value: unknown,
  context?: unknown,
): boolean => {
  const ctx = context as { postType?: string } | undefined;
  if (ctx?.postType === "supportconversations") {
    return true;
  }
  return Boolean(value);
};

export const injectSupportArchiveContentBefore = (
  value: unknown,
  context?: unknown,
): ReactNode[] => {
  const nodes = Array.isArray(value) ? [...(value as ReactNode[])] : [];
  const ctx = context as
    | {
        postType?: string;
        organizationId?: string;
        pluginMenus?: SupportPluginMenuMap;
      }
    | undefined;

  if (ctx?.postType === "supportconversations") {
    // Hide the generic header/content block by inserting an empty fragment in its place
    // and letting the injected SupportArchiveHeader remain.
    return [...nodes, <></>];
  }

  return nodes;
};

export const injectSupportArchiveContent = (
  value: unknown,
  context?: unknown,
): ReactNode[] => {
  const nodes = Array.isArray(value) ? [...(value as ReactNode[])] : [];
  const ctx = context as
    | {
        postType?: string;
        organizationId?: string;
        pluginMenus?: SupportPluginMenuMap;
      }
    | undefined;

  if (ctx?.postType !== "supportconversations") {
    return nodes;
  }

  // Replace the default archive content with the full SupportSystem (includes sidebars).
  return [
    ...nodes,
    <SupportSystem
      key="support-archive-conversations"
      organizationId={(ctx?.organizationId ?? "unknown") as Id<"organizations">}
      params={{ segments: ["conversations"] }}
      buildNavHref={(slug) =>
        slug
          ? `/admin/edit?post_type=supportconversations&tab=${slug}`
          : "/admin/edit?post_type=supportconversations"
      }
    />,
  ];
};
