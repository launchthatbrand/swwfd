"use client";

import type {
  ContactDoc,
  ConversationSummary,
} from "./components/ConversationInspector";
import {
  SidebarInset,
  SidebarProvider,
} from "@launchthatapp/ui/sidebar";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ArticlesView } from "./views/ArticlesView";
import { ConversationLeftSidebar } from "./components/ConversationLeftSidebar";
import { ConversationRightSidebar } from "./components/ConversationRightSidebar";
import { DashboardView } from "./views/DashboardView";
import type { GenericId as Id } from "convex/values";
import { SettingsView } from "./views/SettingsView";
import { TestView } from "./views/ConversationsView";
import { useSupportConversations } from "./hooks/useSupportConversations";

type NavHrefBuilder = (slug: string) => string;

const defaultNavHref: NavHrefBuilder = (slug) =>
  slug ? `/admin/support/${slug}` : "/admin/support";

export interface SupportSystemProps {
  organizationId: Id<"organizations">;
  tenantName?: string;
  params?: { segments?: string[] };
  searchParams?: Record<string, string | string[] | undefined>;
  currentAgent?: {
    id: string;
    name?: string;
    imageUrl?: string;
  };
  buildNavHref?: NavHrefBuilder;
}

const NAV_LINKS = [
  { label: "Dashboard", slug: "" },
  { label: "Articles", slug: "articles" },
  { label: "Conversations", slug: "conversations" },
  { label: "Settings", slug: "settings" },
];

export function SupportSystem({
  organizationId,
  tenantName,
  params,
  searchParams,
  currentAgent,
  buildNavHref = defaultNavHref,
}: SupportSystemProps) {
  const segments = params?.segments ?? [];
  const routeKey = segments[0] ?? "";
  const threadIdParam = searchParams?.threadId ?? searchParams?.sessionId;
  const initialThreadId =
    typeof threadIdParam === "string" ? threadIdParam : undefined;

  const conversations = useSupportConversations(organizationId, 100);
  const [testThreadId, setTestThreadId] = useState<string | undefined>(
    initialThreadId,
  );
  const [sidebarConversation, setSidebarConversation] = useState<
    ConversationSummary | undefined
  >(undefined);
  const [sidebarContact, setSidebarContact] = useState<ContactDoc | null>(null);

  const handleConversationChange = useCallback(
    (conversation?: ConversationSummary, contact?: ContactDoc | null) => {
      setSidebarConversation(conversation);
      setSidebarContact(contact ?? null);
    },
    [],
  );

  const handleBulkDeleteComplete = useCallback(
    (deletedThreadIds: string[]) => {
      if (deletedThreadIds.length === 0) {
        return;
      }
      setTestThreadId((previous) => {
        if (!previous) {
          return previous;
        }
        return deletedThreadIds.includes(previous) ? undefined : previous;
      });
      setSidebarConversation((previous) => {
        if (!previous) {
          return previous;
        }
        return deletedThreadIds.includes(previous.threadId) ? undefined : previous;
      });
      if (testThreadId && deletedThreadIds.includes(testThreadId)) {
        setSidebarContact(null);
      }
    },
    [testThreadId],
  );

  const updateTestThreadId = useCallback(
    (next?: string) => {
      setTestThreadId(next);
      if (routeKey !== "test" || typeof window === "undefined") {
        return;
      }

      const url = new URL(window.location.href);
      if (next) {
        url.searchParams.set("threadId", next);
      } else {
        url.searchParams.delete("threadId");
        url.searchParams.delete("sessionId");
      }
      window.history.replaceState(null, "", url.toString());
    },
    [routeKey],
  );

  useEffect(() => {
    if (routeKey === "test" && !testThreadId && conversations.length > 0) {
      updateTestThreadId(conversations[0]?.threadId);
    }
  }, [routeKey, conversations, testThreadId, updateTestThreadId]);

  useEffect(() => {
    if (routeKey !== "conversations" && routeKey !== "test") {
      setSidebarConversation(undefined);
      setSidebarContact(null);
    }
  }, [routeKey]);

  const content = useMemo(() => {
    switch (routeKey) {
      case "conversations":
        return (
          <TestView
            organizationId={organizationId}
            tenantName={tenantName}
            conversations={conversations}
            activeThreadId={testThreadId}
            onSelectThread={updateTestThreadId}
            onConversationChange={handleConversationChange}
            currentAgent={currentAgent}
          />
        );
      case "settings":
        return <SettingsView organizationId={organizationId} />;
      case "articles":
        return <ArticlesView organizationId={organizationId} />;
      case "test":
        return (
          <TestView
            organizationId={organizationId}
            tenantName={tenantName}
            conversations={conversations}
            activeThreadId={testThreadId}
            onConversationChange={handleConversationChange}
            currentAgent={currentAgent}
          />
        );
      default:
        return (
          <DashboardView
            organizationId={organizationId}
            tenantName={tenantName}
            buildNavHref={buildNavHref}
          />
        );
    }
  }, [
    routeKey,
    organizationId,
    tenantName,
    conversations,
    testThreadId,
    handleConversationChange,
    buildNavHref,
  ]);
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <SidebarProvider
        className="flex h-full min-h-0 flex-1 flex-col"
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        {/* <header className="flex h-12 shrink-0 items-center justify-end gap-2 border-b px-4">
          <div className="w-full">
            <Tabs>
              <TabsList className="h-auto rounded-none">
                {NAV_LINKS.map((link) => {
                  const href = buildNavHref(link.slug ?? "");
                  const isActive = routeKey === (link.slug ?? "");
                  return (
                    <TabsTrigger
                      key={link.slug}
                      value={link.slug ?? ""}
                      asChild
                    >
                      <Link
                        href={href}
                        className={`bg-muted rounded-none px-4 py-1 text-sm font-medium ${
                          isActive
                            ? "bg-primary"
                            : "text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {link.label}
                      </Link>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>
          <SidebarTrigger className="-mr-1 rotate-180" />
        </header> */}
        <div className="relative flex h-full min-h-0 w-full flex-1 md:h-[calc(100vh-75px)] md:max-h-[calc(100vh-75px)]">
          {routeKey === "conversations" && (
            <ConversationLeftSidebar
              organizationId={organizationId}
              conversations={conversations}
              activeThreadId={testThreadId}
              onSelect={updateTestThreadId}
              onBulkDeleteComplete={handleBulkDeleteComplete}
              className="h-full min-h-0"
            />
          )}
          <SidebarInset className="INSET relative min-h-0 overflow-hidden">{content}</SidebarInset>
          {routeKey === "conversations" && (
            <ConversationRightSidebar
              side="right"
              className="absolute hidden h-full min-h-0 md:flex"
              conversation={sidebarConversation}
              contact={sidebarContact}
              fallbackName={
                sidebarConversation?.contactName ??
                (sidebarConversation
                  ? `Thread ${sidebarConversation.threadId.slice(-6)}`
                  : undefined)
              }
              fallbackEmail={sidebarConversation?.contactEmail}
              organizationName={tenantName}
              organizationId={organizationId}
              currentAgent={currentAgent}
            />
          )}
        </div>
      </SidebarProvider>
    </div>
  );
}
