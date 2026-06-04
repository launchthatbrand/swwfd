"use client";

import * as React from "react";
import { Badge } from "@launchthatapp/ui/badge";
import { Button } from "@launchthatapp/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@launchthatapp/ui/card";
import { Input } from "@launchthatapp/ui/input";
import { Label } from "@launchthatapp/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@launchthatapp/ui/select";
import { Textarea } from "@launchthatapp/ui/textarea";

const PROVIDERS = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "google", label: "Google" },
] as const;

const MODELS_BY_PROVIDER: Record<string, string[]> = {
  openai: [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "o3-mini",
  ],
  anthropic: [
    "claude-sonnet-4-20250514",
    "claude-3-5-haiku-20241022",
    "claude-3-5-sonnet-20241022",
  ],
  google: ["gemini-2.5-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
};

const normalizeModelForProvider = (provider: string, model: string) => {
  if (
    provider === "google" &&
    (model === "gemini-2.0-flash" || model === "models/gemini-2.0-flash")
  ) {
    return "gemini-2.5-flash";
  }
  return model;
};

const EMBEDDING_MODELS_BY_PROVIDER: Record<
  string,
  Array<{ id: string; label: string; defaultDimension: number }>
> = {
  openai: [
    {
      id: "text-embedding-3-small",
      label: "OpenAI text-embedding-3-small (1536)",
      defaultDimension: 1536,
    },
    {
      id: "text-embedding-3-large",
      label: "OpenAI text-embedding-3-large (3072)",
      defaultDimension: 3072,
    },
    {
      id: "text-embedding-ada-002",
      label: "OpenAI text-embedding-ada-002 (1536)",
      defaultDimension: 1536,
    },
  ],
  anthropic: [
    {
      id: "text-embedding-3-small",
      label: "OpenAI text-embedding-3-small (1536)",
      defaultDimension: 1536,
    },
  ],
  google: [
    {
      id: "gemini-embedding-001",
      label: "Google gemini-embedding-001",
      defaultDimension: 1536,
    },
    {
      id: "gemini-embedding-2-preview",
      label: "Google gemini-embedding-2-preview",
      defaultDimension: 1536,
    },
    {
      id: "text-embedding-004",
      label: "Google text-embedding-004",
      defaultDimension: 768,
    },
  ],
};

export interface AiSettingsValues {
  key: string;
  provider: string;
  model: string;
  embeddingModel?: string;
  embeddingDimension?: number;
  ragNamespace?: string;
  systemPrompt?: string;
  updatedAt: number;
}

export interface AiSettingsPanelProps {
  settings: AiSettingsValues | null;
  onSave: (args: {
    key?: string;
    provider: string;
    model: string;
    embeddingModel?: string;
    embeddingDimension?: number;
    ragNamespace?: string;
    systemPrompt?: string;
  }) => void | Promise<void>;
  isSaving?: boolean;
}

const formatTime = (ms: number) => new Date(ms).toLocaleString();

export const AiSettingsPanel = ({
  settings,
  onSave,
  isSaving,
}: AiSettingsPanelProps) => {
  const [provider, setProvider] = React.useState(settings?.provider ?? "openai");
  const [model, setModel] = React.useState(settings?.model ?? "gpt-4o-mini");
  const [embeddingModel, setEmbeddingModel] = React.useState(
    settings?.embeddingModel ?? "text-embedding-3-small",
  );
  const [embeddingDimension, setEmbeddingDimension] = React.useState(
    settings?.embeddingDimension ?? 1536,
  );
  const [ragNamespace, setRagNamespace] = React.useState(
    settings?.ragNamespace ?? "portfolio",
  );
  const [systemPrompt, setSystemPrompt] = React.useState(
    settings?.systemPrompt ?? "",
  );

  React.useEffect(() => {
    if (settings) {
      setProvider(settings.provider);
      setModel(normalizeModelForProvider(settings.provider, settings.model));
      const defaultEmbeddingModel =
        settings.provider === "google"
          ? "gemini-embedding-001"
          : "text-embedding-3-small";
      setEmbeddingModel(settings.embeddingModel ?? defaultEmbeddingModel);
      setEmbeddingDimension(settings.embeddingDimension ?? 1536);
      setRagNamespace(settings.ragNamespace ?? "portfolio");
      setSystemPrompt(settings.systemPrompt ?? "");
    }
  }, [settings]);

  const handleProviderChange = (val: string) => {
    setProvider(val);
    const models = MODELS_BY_PROVIDER[val];
    if (models?.[0]) setModel(models[0]);

    const embeddingModels = EMBEDDING_MODELS_BY_PROVIDER[val];
    const nextEmbeddingModel = embeddingModels?.[0];
    if (nextEmbeddingModel) {
      setEmbeddingModel(nextEmbeddingModel.id);
      setEmbeddingDimension(nextEmbeddingModel.defaultDimension);
    }
  };

  const handleEmbeddingModelChange = (val: string) => {
    setEmbeddingModel(val);
    const matched = (EMBEDDING_MODELS_BY_PROVIDER[provider] ?? []).find(
      (m) => m.id === val,
    );
    if (matched) setEmbeddingDimension(matched.defaultDimension);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      provider,
      model,
      embeddingModel,
      embeddingDimension,
      ragNamespace: ragNamespace.trim() || undefined,
      systemPrompt: systemPrompt.trim() || undefined,
    });
  };

  const availableModels = MODELS_BY_PROVIDER[provider] ?? [];
  const embeddingModels = EMBEDDING_MODELS_BY_PROVIDER[provider] ?? [];
  const isGoogleEmbeddingProvider = provider === "google";

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      {/* Chat Model */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Chat model</CardTitle>
              <p className="text-muted-foreground text-sm">
                Provider and model used for AI chat responses.
              </p>
            </div>
            {settings && (
              <Badge variant="secondary" className="text-[10px]">
                Last saved {formatTime(settings.updatedAt)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="ai-provider">Provider</Label>
              <Select value={provider} onValueChange={handleProviderChange}>
                <SelectTrigger id="ai-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ai-model">Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger id="ai-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Embedding Model */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Embedding model</CardTitle>
          <p className="text-muted-foreground text-sm">
            Model used for generating vector embeddings in RAG.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="embedding-model">Embedding model</Label>
              <Select
                value={embeddingModel}
                onValueChange={handleEmbeddingModelChange}
              >
                <SelectTrigger id="embedding-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {embeddingModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="embedding-dimension">
                {isGoogleEmbeddingProvider
                  ? "Output dimensionality"
                  : "Dimension"}
              </Label>
              <Input
                id="embedding-dimension"
                type="number"
                value={embeddingDimension}
                onChange={(e) =>
                  setEmbeddingDimension(Number(e.target.value) || 1536)
                }
                readOnly={!isGoogleEmbeddingProvider}
                min={128}
                max={3072}
                step={1}
              />
              {isGoogleEmbeddingProvider ? (
                <p className="text-xs text-muted-foreground">
                  Google supports flexible output sizes (recommended: 768, 1536,
                  or 3072).
                </p>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RAG */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">RAG knowledge base</CardTitle>
          <p className="text-muted-foreground text-sm">
            Default namespace for retrieval-augmented generation.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-1.5">
            <Label htmlFor="rag-namespace">Default namespace</Label>
            <Input
              id="rag-namespace"
              value={ragNamespace}
              onChange={(e) => setRagNamespace(e.target.value)}
              placeholder="portfolio"
            />
          </div>
        </CardContent>
      </Card>

      {/* System Prompt */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System prompt override</CardTitle>
          <p className="text-muted-foreground text-sm">
            Optional system prompt stored in the database. When set, overrides
            the hardcoded default.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-1.5">
            <Label htmlFor="system-prompt">System prompt</Label>
            <Textarea
              id="system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are a helpful portfolio assistant..."
              rows={6}
              className="resize-y font-mono text-xs"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save settings"}
        </Button>
      </div>
    </form>
  );
};
