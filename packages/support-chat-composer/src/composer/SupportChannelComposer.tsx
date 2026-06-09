"use client";

import { Loader2, SendHorizontal } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@launchthatapp/ui/select";
import { useMemo, useState } from "react";

import { $createParagraphNode, $createTextNode, $getRoot } from "lexical";
import { Button } from "@launchthatapp/ui/button";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";

export type SupportComposerChannel = "email" | "sms";

export interface SupportComposerChannelOption {
  id: SupportComposerChannel;
  label: string;
  enabled: boolean;
  disabledReason?: string;
}

interface SupportChannelComposerProps {
  channels: SupportComposerChannelOption[];
  selectedChannel: SupportComposerChannel;
  onSelectedChannelChange: (next: SupportComposerChannel) => void;
  onSend: (payload: { channel: SupportComposerChannel; text: string }) => Promise<void>;
  isSending: boolean;
  initialText?: string;
}

const lexicalTheme = {
  paragraph: "mb-2",
};

export const SupportChannelComposer = ({
  channels,
  selectedChannel,
  onSelectedChannelChange,
  onSend,
  isSending,
  initialText,
}: SupportChannelComposerProps) => {
  const normalizedInitialText = (initialText ?? "").trim();
  const [plainText, setPlainText] = useState(normalizedInitialText);
  const [editorKey, setEditorKey] = useState(0);

  const selected = useMemo(
    () => channels.find((entry) => entry.id === selectedChannel) ?? null,
    [channels, selectedChannel],
  );

  const canSend = plainText.trim().length > 0 && !isSending && !!selected?.enabled;

  const handleSend = async () => {
    const text = plainText.trim();
    if (!text || !selected?.enabled || isSending) return;
    await onSend({ channel: selectedChannel, text });
    setPlainText("");
    setEditorKey((prev) => prev + 1);
  };

  const initialConfig = useMemo(
    () => ({
      namespace: "support-channel-composer",
      theme: lexicalTheme,
      editorState: () => {
        const root = $getRoot();
        root.clear();
        if (!normalizedInitialText) return;
        const paragraphNode = $createParagraphNode();
        paragraphNode.append($createTextNode(normalizedInitialText));
        root.append(paragraphNode);
      },
      onError(error: Error) {
        throw error;
      },
    }),
    [normalizedInitialText],
  );

  return (
    <div className="space-y-2 rounded-lg border bg-card p-3">
      <LexicalComposer key={`${editorKey}:${normalizedInitialText}`} initialConfig={initialConfig}>
        <div className="rounded-md border bg-background">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                aria-placeholder="Type your message..."
                placeholder={
                  <div className="pointer-events-none px-3 py-2 text-sm text-muted-foreground">
                    Type your message...
                  </div>
                }
                className="min-h-12.5 px-3 py-2 text-sm outline-none"
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <OnChangePlugin
            onChange={(editorState) => {
              editorState.read(() => {
                setPlainText($getRoot().getTextContent());
              });
            }}
          />
        </div>
      </LexicalComposer>

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          {selected?.enabled ? (
            <p className="text-xs text-muted-foreground">
              {selected.id === "email"
                ? "Email send will deliver and log an outreach update."
                : "SMS send will deliver and log an outreach update."}
            </p>
          ) : (
            <p className="text-xs text-destructive">{selected?.disabledReason ?? "Channel unavailable."}</p>
          )}
        </div>

        <div className="flex w-full gap-2 md:w-auto">
          <Select
            value={selectedChannel}
            onValueChange={(value) =>
              onSelectedChannelChange(value as SupportComposerChannel)
            }
          >
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              {channels.map((channel) => (
                <SelectItem
                  key={channel.id}
                  value={channel.id}
                  disabled={!channel.enabled}
                >
                  {channel.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            size="sm"
            className="h-9 min-w-[104px]"
            onClick={() => void handleSend()}
            disabled={!canSend}
          >
            {isSending ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <SendHorizontal className="mr-1 h-4 w-4" />
                Send
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
