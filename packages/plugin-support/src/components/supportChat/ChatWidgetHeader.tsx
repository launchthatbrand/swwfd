"use client";

import { Maximize2, Minimize2, X } from "lucide-react";
import { Badge } from "@launchthatapp/ui/badge";
import { Button } from "@launchthatapp/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@launchthatapp/ui/tabs";
import type { ChatWidgetTab } from "./types";
import type { SupportChatSettings } from "../../settings";
import { cn } from "@launchthatapp/ui/lib/utils";

interface ChatWidgetHeaderProps {
  activeTab: ChatWidgetTab;
  onTabChange: (tab: ChatWidgetTab) => void;
  onClose: () => void;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
  shouldCollectContact: boolean;
  settings: SupportChatSettings;
  resolvedAgentName: string;
  tenantName: string;
  onlineAgentCount: number;
  isAiAutoRespondEnabled: boolean;
  experienceLabel?: string;
  className?: string;
}

export const ChatWidgetHeader = ({
  activeTab,
  onTabChange,
  onClose,
  isExpanded,
  onToggleExpanded,
  shouldCollectContact,
  settings,
  resolvedAgentName,
  tenantName,
  onlineAgentCount,
  isAiAutoRespondEnabled,
  experienceLabel,
  className,
}: ChatWidgetHeaderProps) => {
  return (
    <div className={cn("border-border/60 flex flex-col border-b px-4 py-3", className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">
            {shouldCollectContact ? settings.introHeadline : "Ask Support"}
          </p>
          {experienceLabel ? (
            <Badge variant="secondary" className="mt-1 text-[11px]">
              {experienceLabel}
            </Badge>
          ) : null}
          <p className="text-muted-foreground text-xs">
            {shouldCollectContact
              ? settings.welcomeMessage
              : isAiAutoRespondEnabled
                ? "AI assistant is online and auto-responding 24/7."
                : onlineAgentCount > 0
                  ? `Connected with ${resolvedAgentName} (${onlineAgentCount} online)`
                  : "We're currently offline, but we'll follow up via email."}
          </p>
          {!shouldCollectContact ? (
            <p className="text-muted-foreground/80 text-[11px]">
              Answers tailored for {tenantName}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {onToggleExpanded ? (
            <Button
              size="icon"
              variant="ghost"
              onClick={onToggleExpanded}
              aria-label={isExpanded ? "Collapse chat" : "Expand chat"}
              aria-pressed={Boolean(isExpanded)}
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          ) : null}
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            aria-label="Close support chat"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <Tabs
        value={activeTab}
        onValueChange={(value) => onTabChange(value as ChatWidgetTab)}
        className="mt-3"
      >
        <TabsList className="grid h-9 grid-cols-2">
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          <TabsTrigger value="helpdesk">Helpdesk</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};
