"use client";

import { useState } from "react";
import { Send } from "lucide-react";

import { Button } from "@launchthatapp/ui/button";
import { Textarea } from "@launchthatapp/ui/textarea";

export const ConversationComposer = ({
  disabled,
  onSend,
}: {
  disabled?: boolean;
  onSend: (body: string) => Promise<void>;
}) => {
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);

  return (
    <div className="border-t p-3">
      <div className="flex items-end gap-2">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a reply..."
          disabled={disabled || isSending}
          className="min-h-20"
        />
        <Button
          disabled={disabled || isSending || !draft.trim()}
          onClick={async () => {
            const body = draft.trim();
            if (!body) return;
            setIsSending(true);
            try {
              await onSend(body);
              setDraft("");
            } finally {
              setIsSending(false);
            }
          }}
          className="h-10 shrink-0"
        >
          <Send className="mr-1.5 h-4 w-4" />
          Send
        </Button>
      </div>
    </div>
  );
};
