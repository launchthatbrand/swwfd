"use client";

import type { ComponentType } from "react";
import { useCallback, useState } from "react";
import { BadgeCheck, Bell, Loader, Share2, UserRound } from "lucide-react";

import { Avatar, AvatarFallback } from "@launchthatapp/ui/avatar";
import { Badge } from "@launchthatapp/ui/badge";
import { Button } from "@launchthatapp/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@launchthatapp/ui/tabs";
import { toast } from "@launchthatapp/ui/toast";

import type { ContactDoc, ConversationSummary } from "./ConversationInspector";
import { getInitials } from "./shared/contactUtils";

type TabKey = "messages" | "dashboard";

interface ConversationHeaderProps {
  contact: ContactDoc | null;
  conversation: ConversationSummary | undefined;
  tenantName?: string;
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

const StatusPill = ({
  icon: Icon,
  label,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  tone: "waiting" | "responded";
}) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
      tone === "waiting"
        ? "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200"
        : "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200"
    }`}
  >
    <Icon className="h-3 w-3" />
    {label}
  </span>
);

export const ConversationHeader = ({
  contact,
  conversation,
  tenantName,
  activeTab,
  onTabChange,
}: ConversationHeaderProps) => {
  const name =
    contact?.fullName ??
    contact?.firstName ??
    contact?.lastName ??
    "Unknown visitor";
  const email = contact?.email ?? "No email on file";
  const company = contact?.company ?? tenantName ?? "Visitor";

  const awaitingReply = conversation?.lastRole === "user";
  const [isMuted, setIsMuted] = useState(false);

  const handleMuteToggle = () => {
    setIsMuted((previous) => {
      const next = !previous;
      toast.info(
        next
          ? "You will no longer receive notifications for this conversation."
          : "Notifications re-enabled for this conversation.",
      );
      return next;
    });
  };

  const handleShareLink = useCallback(async () => {
    if (typeof window === "undefined") return;
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Conversation with ${name}`,
          url: shareUrl,
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Conversation link copied to clipboard.");
      } else {
        throw new Error("Share not supported");
      }
    } catch (error) {
      console.error("[conversation-header] share failed", error);
      toast.error("Unable to share the conversation right now.");
    }
  }, [name]);

  return (
    <div className="bg-background flex h-32 flex-col justify-between border-b px-6 py-4 pb-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback>{getInitials(name)}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{name}</h2>
              <Badge variant="outline">{company}</Badge>
            </div>
            <div className="text-muted-foreground flex flex-wrap gap-3 text-sm">
              <span>{email}</span>
              {contact?.phone ? (
                <>
                  <span>•</span>
                  <span>{contact.phone}</span>
                </>
              ) : null}
              {conversation ? (
                <>
                  <span>•</span>
                  <span>Thread {conversation.threadId.slice(-6)}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill
            icon={awaitingReply ? Loader : BadgeCheck}
            label={
              awaitingReply ? "Awaiting agent reply" : "Assistant responded"
            }
            tone={awaitingReply ? "waiting" : "responded"}
          />
          <Button
            size="sm"
            variant={isMuted ? "secondary" : "outline"}
            className="gap-1"
            onClick={handleMuteToggle}
            aria-pressed={isMuted}
          >
            <Bell className="h-4 w-4" />
            {isMuted ? "Muted" : "Mute"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => void handleShareLink()}
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button size="sm" className="gap-1">
            <UserRound className="h-4 w-4" />
            Update status
          </Button>
        </div>
      </div>
      <Tabs
        value={activeTab}
        onValueChange={(value) => onTabChange(value as TabKey)}
        className="mt-4"
      >
        <TabsList className="h-auto rounded-none pb-0">
          <TabsTrigger className="rounded-none text-xs" value="messages">
            Messages
          </TabsTrigger>
          <TabsTrigger className="rounded-none text-xs" value="dashboard">
            Customer Dashboard
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};
