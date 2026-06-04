"use client";

import type { GenericId as Id } from "convex/values";
import { useQuery } from "convex/react";
import {
  Activity,
  ArrowRight,
  MessageSquareText,
  NotebookPen,
} from "lucide-react";

import { Badge } from "@launchthatapp/ui/badge";
import { Button } from "@launchthatapp/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@launchthatapp/ui/card";

import { useSupportConvex } from "../../convex/bindings";
import { SUPPORT_COPY } from "../constants/supportCopy";

interface ConversationSummary {
  threadId: string;
  lastMessage: string;
  lastRole: "user" | "assistant";
  lastAt: number;
  totalMessages: number;
}

interface ArticleSummary {
  _id: string;
}

interface DashboardViewProps {
  organizationId: Id<"organizations">;
  tenantName?: string;
  buildNavHref: (slug: string) => string;
}

export function DashboardView({
  organizationId,
  tenantName,
  buildNavHref,
}: DashboardViewProps) {
  const convex = useSupportConvex();
  // TODO: replace with support-owned knowledge fetch; portal posts are not available here.
  const helpdeskArticles = [] as ArticleSummary[];
  const conversations = useQuery(
    convex.support.queries.listConversations,
    {
      organizationId,
      limit: 50,
    },
  ) as unknown as ConversationSummary[] | undefined;
  const safeConversations = conversations ?? [];

  const totalArticles = helpdeskArticles.length;
  const activeConversations = safeConversations.length;
  const openConversations = safeConversations.filter(
    (conversation) => conversation.lastRole === "user",
  ).length;

  return (
    <div className="container max-w-7xl mx-auto w-full space-y-6 p-6 overflow-y-auto">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Support dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Monitor how the assistant is performing and jump into key workflows.
        </p>
      </div>

      <section>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Helpdesk articles"
            value={totalArticles}
            description="Published long-form answers powering the widget."
            icon={<NotebookPen className="text-primary h-5 w-5" />}
          />
          <StatCard
            title="Active conversations"
            value={activeConversations}
            description="Unique sessions currently tracked for this tenant."
            icon={<MessageSquareText className="text-primary h-5 w-5" />}
          />
          <StatCard
            title="Waiting on reply"
            value={openConversations}
            description="Last message from the visitor."
            icon={<Activity className="text-primary h-5 w-5" />}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>
                Triage responses, inspect transcripts, and configure the
                assistant.
              </CardDescription>
            </div>
            <Badge variant="outline">{tenantName ?? "Org"}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <QuickLink
              href={buildNavHref("conversations")}
              label="Review live conversations"
              description="Inspect transcripts, escalate, or follow up."
            />
            <QuickLink
              href={buildNavHref("articles")}
              label="Helpdesk articles"
              description="Manage long-form answers for the widget."
            />
            <QuickLink
              href={buildNavHref("settings")}
              label="Support settings"
              description="Configure the floating assistant experience."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest conversations</CardTitle>
            <CardDescription>
              Snapshot of the most recent visitor sessions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {safeConversations.length > 0 ? (
              safeConversations.slice(0, 5).map((conversation) => (
                <div
                  key={conversation.threadId}
                  className="flex items-start justify-between rounded-md border p-3 text-sm"
                >
                  <div className="space-y-1">
                    <p className="font-medium">
                      Thread {conversation.threadId.slice(-6)}
                    </p>
                    <p className="text-muted-foreground line-clamp-2">
                      {conversation.lastMessage}
                    </p>
                  </div>
                  <div className="text-muted-foreground text-right text-xs">
                    <p>{new Date(conversation.lastAt).toLocaleDateString()}</p>
                    <p>
                      {conversation.totalMessages} message
                      {conversation.totalMessages === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">
                {SUPPORT_COPY.sidebar.emptyState}
              </p>
            )}
            <Button asChild variant="outline" className="w-full">
              <a href={buildNavHref("conversations")}>
                View all conversations
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="text-muted-foreground text-xs">{description}</p>
      </CardContent>
    </Card>
  );
}

function QuickLink({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="hover:bg-muted flex items-center justify-between rounded-md border px-4 py-3 transition"
    >
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
      <ArrowRight className="text-muted-foreground h-4 w-4" />
    </a>
  );
}
