"use client";

import { Badge } from "@launchthatapp/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@launchthatapp/ui/card";
import { Separator } from "@launchthatapp/ui/separator";

import type {
  ContactDoc,
  ConversationSummary,
} from "../components/ConversationInspector";
import { formatDateTime } from "../components/shared/contactUtils";

export function CustomerDashboard({
  contact,
  conversation,
  tenantName,
}: {
  contact: ContactDoc | null;
  conversation: ConversationSummary | undefined;
  tenantName?: string;
}) {
  const createdAt = contact ? formatDateTime(contact.createdAt) : "—";
  const lastActive = conversation ? formatDateTime(conversation.lastAt) : "—";
  const totalMessages = conversation?.totalMessages ?? 0;
  const tags = contact?.tags ?? [];

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Contact summary</CardTitle>
          <CardDescription>
            Key details stored for this visitor within{" "}
            {tenantName ?? "your org"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <DetailRow label="Email" value={contact?.email ?? "Not provided"} />
          <DetailRow label="Phone" value={contact?.phone ?? "Not provided"} />
          <DetailRow
            label="Company"
            value={contact?.company ?? tenantName ?? "Unknown"}
          />
          <div>
            <p className="text-muted-foreground text-xs tracking-wide uppercase">
              Tags
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.length > 0 ? (
                tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))
              ) : (
                <Badge variant="outline">No tags assigned</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Conversation activity</CardTitle>
          <CardDescription>Recent engagement stats</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <DetailRow label="First seen" value={createdAt} />
          <DetailRow label="Last active" value={lastActive} />
          <DetailRow
            label="Messages exchanged"
            value={`${totalMessages} message${totalMessages === 1 ? "" : "s"}`}
          />
          <Separator />
          <p className="text-muted-foreground text-xs">
            Conversation status:{" "}
            <span className="text-foreground font-medium">
              {conversation?.lastRole === "user"
                ? "Waiting on team"
                : "Assistant responded"}
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-4 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-foreground text-right font-medium">{value}</span>
  </div>
);
