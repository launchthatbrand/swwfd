"use client";

import * as React from "react";
import { Badge } from "@launchthatapp/ui/badge";
import { Button } from "@launchthatapp/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@launchthatapp/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@launchthatapp/ui/dialog";
import { Input } from "@launchthatapp/ui/input";
import { Label } from "@launchthatapp/ui/label";
import { Textarea } from "@launchthatapp/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@launchthatapp/ui/table";

export interface RagNamespace {
  _id: string;
  namespace: string;
  modelId: string;
  dimension: number;
  status: string;
}

export interface RagEntry {
  _id: string;
  _creationTime: number;
  key?: string;
  title?: string;
  importance: number;
  status: string;
}

export interface AiRagSourcesPanelProps {
  namespaces: RagNamespace[];
  entries: RagEntry[];
  selectedNamespaceId: string | null;
  onSelectNamespace: (id: string | null) => void;
  onAddContent: (args: {
    namespace: string;
    key: string;
    text: string;
    title?: string;
    importance?: number;
  }) => void | Promise<void>;
  onDeleteEntry: (entryId: string) => void | Promise<void>;
  isLoading?: boolean;
  isAdding?: boolean;
}

const formatTime = (ms: number) => new Date(ms).toLocaleString();

export const AiRagSourcesPanel = ({
  namespaces,
  entries,
  selectedNamespaceId,
  onSelectNamespace,
  onAddContent,
  onDeleteEntry,
  isLoading,
  isAdding,
}: AiRagSourcesPanelProps) => {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [addNamespace, setAddNamespace] = React.useState("portfolio");
  const [addKey, setAddKey] = React.useState("");
  const [addTitle, setAddTitle] = React.useState("");
  const [addText, setAddText] = React.useState("");
  const [addImportance, setAddImportance] = React.useState("1");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addKey.trim() || !addText.trim()) return;
    await onAddContent({
      namespace: addNamespace.trim() || "portfolio",
      key: addKey.trim(),
      text: addText.trim(),
      title: addTitle.trim() || undefined,
      importance: Number(addImportance) || 1,
    });
    setAddKey("");
    setAddTitle("");
    setAddText("");
    setAddImportance("1");
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Namespaces */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">RAG namespaces</CardTitle>
              <p className="text-muted-foreground text-sm">
                Knowledge base namespaces with embedded content.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : namespaces.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No RAG namespaces yet. Add content below to create one.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {namespaces.map((ns) => (
                <button
                  key={ns._id}
                  type="button"
                  onClick={() =>
                    onSelectNamespace(
                      selectedNamespaceId === ns._id ? null : ns._id,
                    )
                  }
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    selectedNamespaceId === ns._id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <span className="font-medium">{ns.namespace}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {ns.modelId}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {ns.dimension}d
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entries */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                {selectedNamespaceId
                  ? "Indexed entries"
                  : "All indexed entries"}
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Documents indexed into the RAG knowledge base.
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">Add content</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <form onSubmit={(e) => void handleSubmit(e)}>
                  <DialogHeader>
                    <DialogTitle>Add RAG content</DialogTitle>
                    <DialogDescription>
                      Index text content into the knowledge base for AI
                      retrieval.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4 grid gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1.5">
                        <Label htmlFor="rag-namespace">Namespace</Label>
                        <Input
                          id="rag-namespace"
                          value={addNamespace}
                          onChange={(e) => setAddNamespace(e.target.value)}
                          placeholder="portfolio"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="rag-key">Key (unique ID)</Label>
                        <Input
                          id="rag-key"
                          value={addKey}
                          onChange={(e) => setAddKey(e.target.value)}
                          placeholder="e.g. project:adascout"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1.5">
                        <Label htmlFor="rag-title">Title</Label>
                        <Input
                          id="rag-title"
                          value={addTitle}
                          onChange={(e) => setAddTitle(e.target.value)}
                          placeholder="AdaScout"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="rag-importance">Importance</Label>
                        <Input
                          id="rag-importance"
                          type="number"
                          step="0.1"
                          min="0"
                          max="10"
                          value={addImportance}
                          onChange={(e) => setAddImportance(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="rag-text">Content</Label>
                      <Textarea
                        id="rag-text"
                        value={addText}
                        onChange={(e) => setAddText(e.target.value)}
                        placeholder="Paste or type the content to index..."
                        rows={8}
                        className="resize-y"
                      />
                    </div>
                  </div>
                  <DialogFooter className="mt-6">
                    <Button type="submit" disabled={isAdding}>
                      {isAdding ? "Indexing..." : "Index content"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : entries.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {selectedNamespaceId
                ? "No entries in this namespace."
                : "No RAG entries yet. Click \"Add content\" to index your first document."}
            </p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="text-right">Importance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Indexed</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry._id}>
                      <TableCell className="max-w-[200px] truncate font-mono text-xs">
                        {entry.key ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">
                        {entry.title ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {entry.importance}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            entry.status === "ready" ? "default" : "secondary"
                          }
                        >
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatTime(entry._creationTime)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => void onDeleteEntry(entry._id)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
