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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@launchthatapp/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@launchthatapp/ui/table";

export interface AiPricingRow {
  id: string;
  providerId: string;
  modelId: string;
  inputCostPer1k: number;
  outputCostPer1k: number;
  creditMultiplier: number;
  isActive: boolean;
  updatedAt: number;
}

export interface AiPricingUpsertPayload {
  providerId: string;
  modelId: string;
  inputCostPer1k: number;
  outputCostPer1k: number;
  creditMultiplier: number;
}

export interface AiPricingTableProps {
  rows: AiPricingRow[];
  isLoading?: boolean;
  isSyncing?: boolean;
  title?: string;
  onSync?: () => void | Promise<void>;
  onUpsert?: (payload: AiPricingUpsertPayload) => void | Promise<void>;
}

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 4 });

export const AiPricingTable = ({
  rows,
  isLoading,
  isSyncing,
  title = "AI model pricing",
  onSync,
  onUpsert,
}: AiPricingTableProps) => {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editRow, setEditRow] = React.useState<AiPricingRow | null>(null);

  const [providerId, setProviderId] = React.useState("");
  const [modelId, setModelId] = React.useState("");
  const [inputCost, setInputCost] = React.useState("");
  const [outputCost, setOutputCost] = React.useState("");
  const [multiplier, setMultiplier] = React.useState("1");

  const openNew = () => {
    setEditRow(null);
    setProviderId("");
    setModelId("");
    setInputCost("");
    setOutputCost("");
    setMultiplier("1");
    setDialogOpen(true);
  };

  const openEdit = (row: AiPricingRow) => {
    setEditRow(row);
    setProviderId(row.providerId);
    setModelId(row.modelId);
    setInputCost(String(row.inputCostPer1k));
    setOutputCost(String(row.outputCostPer1k));
    setMultiplier(String(row.creditMultiplier));
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpsert) return;
    await onUpsert({
      providerId: providerId.trim(),
      modelId: modelId.trim(),
      inputCostPer1k: Number(inputCost),
      outputCostPer1k: Number(outputCost),
      creditMultiplier: Number(multiplier),
    });
    setDialogOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="text-muted-foreground text-sm">
              Per-model pricing used for credit deductions.
            </p>
          </div>
          <div className="flex gap-2">
            {onSync && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void onSync()}
                disabled={isSyncing}
              >
                {isSyncing ? "Syncing..." : "Sync from providers"}
              </Button>
            )}
            {onUpsert && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={openNew}>
                    Add model
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={(e) => void handleSubmit(e)}>
                    <DialogHeader>
                      <DialogTitle>
                        {editRow ? "Edit pricing" : "Add model pricing"}
                      </DialogTitle>
                      <DialogDescription>
                        Configure cost-per-1k-token pricing and credit
                        multiplier.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 grid gap-4">
                      <div className="grid gap-1.5">
                        <Label htmlFor="provider">Provider</Label>
                        <Select value={providerId} onValueChange={setProviderId}>
                          <SelectTrigger id="provider">
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="openai">OpenAI</SelectItem>
                            <SelectItem value="anthropic">Anthropic</SelectItem>
                            <SelectItem value="google">Google</SelectItem>
                            <SelectItem value="mistral">Mistral</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="model">Model ID</Label>
                        <Input
                          id="model"
                          value={modelId}
                          onChange={(e) => setModelId(e.target.value)}
                          placeholder="e.g. gpt-4o"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                          <Label htmlFor="inputCost">Input $/1k tokens</Label>
                          <Input
                            id="inputCost"
                            type="number"
                            step="0.0001"
                            value={inputCost}
                            onChange={(e) => setInputCost(e.target.value)}
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor="outputCost">Output $/1k tokens</Label>
                          <Input
                            id="outputCost"
                            type="number"
                            step="0.0001"
                            value={outputCost}
                            onChange={(e) => setOutputCost(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="multiplier">Credit multiplier</Label>
                        <Input
                          id="multiplier"
                          type="number"
                          step="0.1"
                          value={multiplier}
                          onChange={(e) => setMultiplier(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter className="mt-6">
                      <Button type="submit">
                        {editRow ? "Update" : "Create"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground text-sm">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="text-muted-foreground text-sm">
            No pricing entries configured. Sync from providers or add manually.
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Input $/1k</TableHead>
                  <TableHead className="text-right">Output $/1k</TableHead>
                  <TableHead className="text-right">Multiplier</TableHead>
                  <TableHead>Status</TableHead>
                  {onUpsert && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.providerId}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.modelId}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {fmt(row.inputCostPer1k)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {fmt(row.outputCostPer1k)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {row.creditMultiplier}x
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={row.isActive ? "default" : "secondary"}
                      >
                        {row.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    {onUpsert && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(row)}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
