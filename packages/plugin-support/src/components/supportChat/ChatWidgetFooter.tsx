"use client";

import type { ChangeEvent, FormEvent } from "react";
import { Loader2, Send } from "lucide-react";

import { Button } from "@launchthatapp/ui/button";
import type { ChatWidgetTab } from "./types";
import { cn } from "@launchthatapp/ui/lib/utils";

interface ChatWidgetFooterProps {
  activeTab: ChatWidgetTab;
  shouldCollectContact: boolean;
  composerDisabled: boolean;
  input: string;
  onInputChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isSubmitDisabled: boolean;
  showSubmitSpinner: boolean;
  className?: string;
}

export const ChatWidgetFooter = ({
  activeTab,
  shouldCollectContact,
  composerDisabled,
  input,
  onInputChange,
  onSubmit,
  isSubmitDisabled,
  showSubmitSpinner,
  className,
}: ChatWidgetFooterProps) => {
  if (activeTab !== "conversations" || shouldCollectContact) {
    return null;
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn("border-border/60 border-t p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]", className)}
    >
      <div className="flex items-center gap-2">
        <textarea
          value={input}
          onChange={onInputChange}
          placeholder="Ask a question..."
          className="border-border/60 bg-muted focus:border-primary min-h-[40px] flex-1 resize-none rounded-xl border px-3 py-2 text-base focus:outline-none md:text-sm"
          rows={1}
          disabled={composerDisabled}
        />
        <Button type="submit" size="icon" disabled={isSubmitDisabled}>
          {showSubmitSpinner ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      {/* <p className="text-muted-foreground mt-2 text-center text-[10px]">
        Responses may reference your courses, lessons, and FAQs.
      </p> */}
    </form>
  );
};
