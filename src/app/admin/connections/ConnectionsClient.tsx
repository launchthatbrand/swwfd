"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "@convex-config/_generated/dataModel";
import { api } from "@convex-config/_generated/api";
import { Badge } from "@launchthatapp/ui/badge";
import { Button } from "@launchthatapp/ui/button";

const formatDateTime = (epochMs: number) => {
  return new Date(epochMs).toLocaleString();
};

export const ConnectionsClient = () => {
  const connections = useQuery(api.outlookConnections.listForAdmin, { limit: 500 });
  const removeConnection = useMutation(api.outlookConnections.removeConnectionAsAdmin);
  const [pendingId, setPendingId] = useState<Id<"outlookConnections"> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const connectedCount = useMemo(() => connections?.length ?? 0, [connections]);

  const handleDisconnect = async (connectionId: Id<"outlookConnections">) => {
    const confirmed = window.confirm(
      "Disconnect this Outlook connection? This user will need to re-authorize before sending email.",
    );
    if (!confirmed) return;
    setErrorMessage(null);
    setPendingId(connectionId);
    try {
      await removeConnection({ connectionId });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to remove connection";
      setErrorMessage(message);
    } finally {
      setPendingId(null);
    }
  };

  if (connections === undefined) {
    return <div className="text-muted-foreground text-sm">Loading connections...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">Outlook connections: {connectedCount}</Badge>
      </div>
      {errorMessage ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}
      {connections.length === 0 ? (
        <div className="text-muted-foreground text-sm">
          No Outlook connections found yet.
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map((connection) => (
            <div
              key={connection._id}
              className="space-y-3 rounded-lg border border-border/70 bg-card p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">
                    {connection.displayName || connection.email || "Unnamed Outlook account"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {connection.email || "No mailbox email on record"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void handleDisconnect(connection._id);
                  }}
                  disabled={pendingId === connection._id}
                >
                  {pendingId === connection._id ? "Disconnecting..." : "Disconnect"}
                </Button>
              </div>
              <div className="grid gap-2 text-xs md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <span className="text-muted-foreground">Monday account:</span>{" "}
                  <span className="font-medium">{connection.mondayAccountId}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Monday user:</span>{" "}
                  <span className="font-medium">{connection.mondayUserId}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">App client:</span>{" "}
                  <span className="font-medium">
                    {connection.mondayAppClientId || "(default)"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tenant:</span>{" "}
                  <span className="font-medium">{connection.tenantId}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Client:</span>{" "}
                  <span className="font-medium">{connection.clientId}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Token expiry:</span>{" "}
                  <span className="font-medium">
                    {formatDateTime(connection.accessTokenExpiresAt)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Updated:</span>{" "}
                  <span className="font-medium">{formatDateTime(connection.updatedAt)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>{" "}
                  <span className="font-medium">{formatDateTime(connection.createdAt)}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {connection.scopes.map((scope) => (
                  <Badge key={`${connection._id}-${scope}`} variant="outline">
                    {scope}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
