"use client";

import type { ChatWidgetTab, HelpdeskArticle } from "./types";
import type { FormEvent, MutableRefObject } from "react";

import { Button } from "@launchthatapp/ui/button";
import type { ChatHistoryMessage } from "../hooks/useSupportChatHistory";
import { Input } from "@launchthatapp/ui/input";
import { Label } from "@launchthatapp/ui/label";
import { Loader2 } from "lucide-react";
import type { SupportChatSettings } from "../../settings";
import { Textarea } from "@launchthatapp/ui/textarea";
import { cn } from "@launchthatapp/ui/lib/utils";

const stripAssistantEnvelope = (rawContent: string): string => {
  if (!rawContent) return rawContent;
  const trimmed = rawContent.trim();
  if (!trimmed.startsWith("{")) return rawContent;
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
  } catch {
    // ignore
  }
  return rawContent;
};

interface ContactFormState {
  fullName: string;
  email: string;
  phone: string;
  company: string;
}

interface ChatWidgetContentProps {
  activeTab: ChatWidgetTab;
  settings: SupportChatSettings;
  shouldCollectContact: boolean;
  isExpanded?: boolean;
  contactForm: ContactFormState;
  contactError: string | null;
  isSubmittingContact: boolean;
  onContactFieldChange: (field: keyof ContactFormState, value: string) => void;
  onSubmitContact: (event: FormEvent<HTMLFormElement>) => void;
  messageListRef: MutableRefObject<HTMLDivElement | null>;
  displayedMessages: ChatHistoryMessage[];
  agentMetadataByMessageId: Map<string, string | undefined>;
  assistantIsResponding: boolean;
  error: Error | undefined;
  reload: () => void;
  agentIsTyping: boolean;
  resolvedAgentName: string;
  tenantName: string;
  description: string;
  helpdeskArticles: HelpdeskArticle[];
  isApplyingAuthoringPlan?: boolean;
  onApplyAuthoringPlan?: (payload: Record<string, unknown>) => void;
  className?: string;
}

export const ChatWidgetContent = ({
  activeTab,
  settings,
  shouldCollectContact,
  isExpanded,
  contactForm,
  contactError,
  isSubmittingContact,
  onContactFieldChange,
  onSubmitContact,
  messageListRef,
  displayedMessages,
  agentMetadataByMessageId,
  assistantIsResponding,
  error,
  reload,
  agentIsTyping,
  resolvedAgentName,
  tenantName,
  description,
  helpdeskArticles,
  isApplyingAuthoringPlan = false,
  onApplyAuthoringPlan,
  className,
}: ChatWidgetContentProps) => {
  const contentHeightClass = isExpanded ? "flex-1 min-h-0" : "h-80";

  if (activeTab === "helpdesk") {
    return (
      <div
        className={cn(
          "flex flex-col gap-3 overflow-y-auto px-4 py-4",
          contentHeightClass,
          className,
        )}
      >
        {helpdeskArticles.map((article) => {
          const articleUrl = article.slug
            ? `/helpdesk/${article.slug}`
            : undefined;
          return (
            <button
              key={article.id}
              type="button"
              className="bg-muted/40 hover:border-primary/60 hover:bg-muted/70 focus-visible:ring-primary/70 rounded-lg border p-3 text-left text-sm transition focus-visible:ring-2 focus-visible:outline-none"
              onClick={() => {
                if (articleUrl) {
                  window.open(articleUrl, "_blank", "noopener,noreferrer");
                }
              }}
              disabled={!articleUrl}
              aria-label={
                articleUrl ? `Open article ${article.title}` : undefined
              }
            >
              <p className="font-semibold">{article.title}</p>
              <p className="text-muted-foreground text-xs">{article.summary}</p>
              <p className="text-muted-foreground mt-2 text-[11px]">
                Updated {article.updatedAt}
              </p>
              {!articleUrl ? (
                <span className="text-muted-foreground mt-2 block text-[11px]">
                  Draft article—no public link yet.
                </span>
              ) : null}
            </button>
          );
        })}
        {helpdeskArticles.length === 0 ? (
          <div className="text-muted-foreground text-center text-sm">
            No helpdesk articles available.
          </div>
        ) : null}
      </div>
    );
  }

  if (shouldCollectContact) {
    return (
      <form
        className={cn(
          "flex flex-col gap-3 overflow-y-auto px-4 py-4",
          contentHeightClass,
          className,
        )}
        onSubmit={onSubmitContact}
      >
        {settings.fields.fullName && (
          <div className="space-y-1 text-sm">
            <Label htmlFor="support-fullName">Full name</Label>
            <Input
              id="support-fullName"
              value={contactForm.fullName}
              onChange={(event) =>
                onContactFieldChange("fullName", event.target.value)
              }
              placeholder="Jane Customer"
              required
            />
          </div>
        )}
        {settings.fields.email && (
          <div className="space-y-1 text-sm">
            <Label htmlFor="support-email">Email</Label>
            <Input
              id="support-email"
              type="email"
              value={contactForm.email}
              onChange={(event) =>
                onContactFieldChange("email", event.target.value)
              }
              placeholder="jane@example.com"
              required
            />
          </div>
        )}
        {settings.fields.phone && (
          <div className="space-y-1 text-sm">
            <Label htmlFor="support-phone">Phone</Label>
            <Input
              id="support-phone"
              value={contactForm.phone}
              onChange={(event) =>
                onContactFieldChange("phone", event.target.value)
              }
              placeholder="+1 (555) 123-4567"
            />
          </div>
        )}
        {settings.fields.company && (
          <div className="space-y-1 text-sm">
            <Label htmlFor="support-company">Company</Label>
            <Input
              id="support-company"
              value={contactForm.company}
              onChange={(event) =>
                onContactFieldChange("company", event.target.value)
              }
              placeholder="Acme Co."
            />
          </div>
        )}

        {contactError && (
          <p className="text-destructive text-xs">{contactError}</p>
        )}
        <p className="text-muted-foreground text-[11px]">
          {settings.privacyMessage}
        </p>
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmittingContact}>
            {isSubmittingContact ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Start chatting"
            )}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-4 overflow-y-auto px-4 py-4",
        contentHeightClass,
        className,
      )}
      ref={messageListRef}
    >
      {displayedMessages.length === 0 && (
        <div className="bg-muted/40 text-muted-foreground rounded-lg p-3 text-xs">
          {description}
        </div>
      )}

      {displayedMessages.map((message) => {
        const assistantName = message.id
          ? agentMetadataByMessageId.get(message.id)
          : undefined;
        const renderedContent =
          typeof message.content === "string"
            ? stripAssistantEnvelope(message.content)
            : String(message.content ?? "");
        return (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div className="max-w-[80%]">
              <div
                className={cn(
                  "rounded-2xl px-3 py-2 text-sm",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                {message.role === "assistant" && assistantName ? (
                  <p className="text-muted-foreground mb-1 text-[11px] font-semibold">
                    {assistantName}
                  </p>
                ) : null}
                {renderedContent}
              </div>

              {message.role === "assistant" &&
                Array.isArray((message as any).sources) &&
                (message as any).sources.length > 0 ? (
                <div className="mt-2 space-y-2">
                  <p className="text-muted-foreground text-[11px] font-semibold">
                    Sources
                  </p>
                  <div className="grid gap-2">
                    {(message as any).sources.map(
                      (source: {
                        title: string;
                        url: string;
                        source?: string;
                      }) => (
                        <button
                          key={`${source.title}-${source.url}`}
                          type="button"
                          className="bg-muted/40 hover:border-primary/60 hover:bg-muted/70 focus-visible:ring-primary/70 rounded-lg border p-2 text-left text-xs transition focus-visible:ring-2 focus-visible:outline-none"
                          onClick={() => {
                            if (source.url) {
                              window.open(source.url, "_blank", "noopener,noreferrer");
                            }
                          }}
                        >
                          <p className="font-semibold">{source.title}</p>
                          {source.source ? (
                            <p className="text-muted-foreground text-[11px]">
                              {source.source}
                            </p>
                          ) : null}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              ) : null}

              {message.role === "assistant" &&
                (message as any).authoringPlan &&
                typeof onApplyAuthoringPlan === "function" ? (
                <div className="bg-muted/30 mt-2 space-y-2 rounded-lg border p-2">
                  <p className="text-[11px] font-semibold">LMS Authoring Preview</p>
                  {Array.isArray((message as any).authoringPlan?.plan?.sections) ? (
                    <p className="text-muted-foreground text-[11px]">
                      {(message as any).authoringPlan.plan.sections.length} planned sections.
                    </p>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={isApplyingAuthoringPlan}
                    onClick={() =>
                      onApplyAuthoringPlan(
                        ((message as any).authoringPlan?.applyPayload ??
                          {}) as Record<string, unknown>,
                      )
                    }
                  >
                    {isApplyingAuthoringPlan ? "Applying..." : "Apply"}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}

      {assistantIsResponding && (
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Thinking...
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-2 text-xs">
          Something went wrong.{" "}
          <button type="button" onClick={reload} className="underline">
            Try again
          </button>
        </div>
      )}

      {agentIsTyping && (
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {resolvedAgentName} is typing…
        </div>
      )}
    </div>
  );
};
