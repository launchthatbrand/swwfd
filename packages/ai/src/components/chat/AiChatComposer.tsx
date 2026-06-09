"use client";

import type { ChatStatus, FileUIPart } from "ai";
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "../../components/ai-elements/attachments";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "../../components/ai-elements/model-selector";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  usePromptInputController,
} from "../../components/ai-elements/prompt-input";
import { Button } from "@launchthatapp/ui/button";
import { ButtonGroup } from "@launchthatapp/ui/button-group";
import { CheckIcon, GlobeIcon } from "lucide-react";
import type { HTMLAttributes } from "react";
import { useState } from "react";
import { cn } from "@launchthatapp/ui";

export interface AiChatComposerProps extends HTMLAttributes<HTMLDivElement> {
  status?: ChatStatus;
  disabled?: boolean;
  onStop?: () => void;
  onSend: (input: string, files: FileUIPart[]) => void | Promise<void>;
  placeholder?: string;
  modelLabel?: string;
  modelProvider?: string;
  lockModelSelector?: boolean;
}

const models = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    chef: "OpenAI",
    chefSlug: "openai",
    providers: ["openai", "azure"],
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    chef: "OpenAI",
    chefSlug: "openai",
    providers: ["openai", "azure"],
  },
  {
    id: "claude-opus-4-20250514",
    name: "Claude 4 Opus",
    chef: "Anthropic",
    chefSlug: "anthropic",
    providers: ["anthropic", "azure", "google", "amazon-bedrock"],
  },
  {
    id: "claude-sonnet-4-20250514",
    name: "Claude 4 Sonnet",
    chef: "Anthropic",
    chefSlug: "anthropic",
    providers: ["anthropic", "azure", "google", "amazon-bedrock"],
  },
  {
    id: "gemini-2.0-flash-exp",
    name: "Gemini 2.0 Flash",
    chef: "Google",
    chefSlug: "google",
    providers: ["google"],
  },
];

const PromptInputAttachmentsDisplay = () => {
  const attachments = usePromptInputAttachments();

  if (attachments.files.length === 0) {
    return null;
  }

  return (
    <Attachments variant="inline">
      {attachments.files.map((attachment) => (
        <Attachment
          data={attachment}
          key={attachment.id}
          onRemove={() => attachments.remove(attachment.id)}
        >
          <AttachmentPreview />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
};

const HeaderControls = () => {
  const controller = usePromptInputController();

  return (
    <header className="mt-8 flex items-center justify-between">
      <p className="text-sm">
        Header Controls via{" "}
        <code className="rounded-md bg-muted p-1 font-bold">
          PromptInputProvider
        </code>
      </p>
      <ButtonGroup>
        <Button
          onClick={() => {
            controller.textInput.clear();
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          Clear input
        </Button>
        <Button
          onClick={() => {
            controller.textInput.setInput("Inserted via PromptInputProvider");
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          Set input
        </Button>

        <Button
          onClick={() => {
            controller.attachments.clear();
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          Clear attachments
        </Button>
      </ButtonGroup>
    </header>
  );
};

const AiChatComposer = ({
  status: externalStatus,
  disabled,
  onStop,
  onSend,
  className,
  placeholder,
  modelLabel,
  modelProvider,
  lockModelSelector,
}: AiChatComposerProps) => {
  const [model, setModel] = useState<string>(models[0]?.id ?? "");
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [status, setStatus] = useState<
    "submitted" | "streaming" | "ready" | "error"
  >("ready");

  const selectedModelData = models.find((m) => m.id === model);
  const effectiveModelLabel = modelLabel ?? selectedModelData?.name ?? "Model";
  const effectiveModelProvider = modelProvider ?? selectedModelData?.chefSlug;

  const handleSubmit = async (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    setStatus("submitted");
    await onSend(message.text, message.files ?? []);
    setStatus("ready");
  };

  return (
    <div className={cn("size-full", className)}>
      <PromptInputProvider>
        <PromptInput globalDrop multiple onSubmit={handleSubmit}>
          <PromptInputAttachmentsDisplay />
          <PromptInputBody>
            <PromptInputTextarea disabled={disabled} placeholder={placeholder} />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
              <PromptInputButton>
                <GlobeIcon size={16} />
                <span>Search</span>
              </PromptInputButton>
              {lockModelSelector ? (
                <PromptInputButton disabled>
                  {effectiveModelProvider ? (
                    <ModelSelectorLogo
                      provider={effectiveModelProvider}
                    />
                  ) : null}
                  <ModelSelectorName>{effectiveModelLabel}</ModelSelectorName>
                </PromptInputButton>
              ) : (
                <ModelSelector
                  onOpenChange={setModelSelectorOpen}
                  open={modelSelectorOpen}
                >
                  <ModelSelectorTrigger asChild>
                    <PromptInputButton>
                      {selectedModelData?.chefSlug && (
                        <ModelSelectorLogo
                          provider={selectedModelData.chefSlug}
                        />
                      )}
                      {selectedModelData?.name && (
                        <ModelSelectorName>
                          {selectedModelData.name}
                        </ModelSelectorName>
                      )}
                    </PromptInputButton>
                  </ModelSelectorTrigger>
                  <ModelSelectorContent>
                    <ModelSelectorInput placeholder="Search models..." />
                    <ModelSelectorList>
                      <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                      {["OpenAI", "Anthropic", "Google"].map((chef) => (
                        <ModelSelectorGroup heading={chef} key={chef}>
                          {models
                            .filter((m) => m.chef === chef)
                            .map((m) => (
                              <ModelSelectorItem
                                key={m.id}
                                onSelect={() => {
                                  setModel(m.id);
                                  setModelSelectorOpen(false);
                                }}
                                value={m.id}
                              >
                                <ModelSelectorLogo provider={m.chefSlug} />
                                <ModelSelectorName>{m.name}</ModelSelectorName>
                                <ModelSelectorLogoGroup>
                                  {m.providers.map((provider) => (
                                    <ModelSelectorLogo
                                      key={provider}
                                      provider={provider}
                                    />
                                  ))}
                                </ModelSelectorLogoGroup>
                                {model === m.id ? (
                                  <CheckIcon className="ml-auto size-4" />
                                ) : (
                                  <div className="ml-auto size-4" />
                                )}
                              </ModelSelectorItem>
                            ))}
                        </ModelSelectorGroup>
                      ))}
                    </ModelSelectorList>
                  </ModelSelectorContent>
                </ModelSelector>
              )}
            </PromptInputTools>
            <PromptInputSubmit
              onStop={onStop}
              status={externalStatus ?? status}
            />
          </PromptInputFooter>
        </PromptInput>

        {/* <HeaderControls /> */}
      </PromptInputProvider>
    </div>
  );
};

export { AiChatComposer };
