import { Button } from "@launchthatapp/ui/button";
import type { FunctionReference } from "convex/server";
import { useQuery } from "convex/react";

export type DashboardWidgetRenderProps = {
  organizationId?: string | null;
  navigate: (to: string) => void;
};

const listConversationsRef =
  "plugins/support/queries:listConversations" as unknown as FunctionReference<
    "query",
    "public"
  >;

type ConversationRow = {
  lastRole?: "user" | "assistant";
};

const toOrganizationId = (
  value: DashboardWidgetRenderProps["organizationId"],
): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const SupportDashboardWidgetCard = ({
  organizationId,
  navigate,
}: DashboardWidgetRenderProps) => {
  const orgId = toOrganizationId(organizationId);
  const conversations = useQuery(
    listConversationsRef,
    orgId
      ? ({ organizationId: orgId, limit: 50 } as {
          organizationId: string;
          limit: number;
        })
      : "skip",
  ) as ConversationRow[] | undefined;

  const total = conversations?.length ?? 0;
  const waiting =
    conversations?.filter((conversation) => conversation.lastRole === "user")
      .length ?? 0;

  return (
    <div className="space-y-3">
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-md border p-2">
          <p className="text-muted-foreground text-xs">Conversations</p>
          <p className="text-base font-semibold">{conversations ? total : "—"}</p>
        </div>
        <div className="rounded-md border p-2">
          <p className="text-muted-foreground text-xs">Waiting on reply</p>
          <p className="text-base font-semibold">{conversations ? waiting : "—"}</p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={() => navigate("/admin/support")}>
        Open Support
      </Button>
    </div>
  );
};
