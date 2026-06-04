"use client";

import { Button } from "@launchthatapp/ui/button";
import { Card } from "@launchthatapp/ui/card";
import type { ColumnDefinition } from "@launchthatapp/ui/entity-list";
import { EntityList } from "@launchthatapp/ui/entity-list";
import { FilePlus2 } from "lucide-react";
import type { GenericId as Id } from "convex/values";
import { formatDistanceToNow } from "date-fns";
import { useMemo } from "react";
import { useQuery } from "convex/react";

import { useSupportConvex } from "../../convex/bindings";

const SUPPORT_ARTICLE_ROUTE_BASE = "/admin/support/articles";

type SupportArticle = {
  _id: string;
  title?: string | null;
  excerpt?: string | null;
  status?: "draft" | "published" | "archived";
  slug?: string | null;
  updatedAt?: number | null;
  createdAt?: number | null;
};

interface ArticlesViewProps {
  organizationId: Id<"organizations">;
}

export const ArticlesView = ({ organizationId }: ArticlesViewProps) => {
  const convex = useSupportConvex();
  const queryResult = useQuery(convex.support.queries.listHelpdeskArticles, {
    organizationId,
    limit: 100,
  }) as SupportArticle[] | undefined;
  const isLoading = queryResult === undefined;

  const rows = useMemo(
    () =>
      (queryResult ?? []).map((article) => ({
        id: article._id,
        title: article.title || "Untitled article",
        status: article.status ?? "draft",
        updatedAt: (article as any).updatedAt ?? (article as any).createdAt ?? Date.now(),
      })),
    [queryResult],
  );

  const columns = useMemo<ColumnDefinition<(typeof rows)[number]>[]>(
    () => [
      {
        id: "title",
        accessorKey: "title",
        header: "Title",
        cell: (row: (typeof rows)[number]) => (
          <a
            href={`${SUPPORT_ARTICLE_ROUTE_BASE}/${row.id}`}
            className="font-medium hover:underline"
          >
            {row.title}
          </a>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: (row: (typeof rows)[number]) => (
          <span className="text-sm capitalize">{row.status}</span>
        ),
      },
      {
        id: "updatedAt",
        header: "Updated",
        cell: (row: (typeof rows)[number]) => (
          <span className="text-muted-foreground text-sm">
            {formatDistanceToNow(row.updatedAt, { addSuffix: true })}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-muted-foreground text-xs tracking-wide uppercase">
              Helpdesk
            </p>
            <h1 className="text-2xl font-semibold">Helpdesk articles</h1>
            <p className="text-muted-foreground text-sm">
              Manage the knowledge base entries surfaced inside the support
              widget.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <a href={SUPPORT_ARTICLE_ROUTE_BASE}>
                Open editor
              </a>
            </Button>
            <Button asChild className="gap-2">
              <a href={`${SUPPORT_ARTICLE_ROUTE_BASE}/new`}>
                <FilePlus2 className="h-4 w-4" />
                New article
              </a>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <Card className="overflow-hidden border-0 shadow-none">
          <EntityList
            data={rows}
            columns={columns}
            isLoading={isLoading}
            enableFooter={false}
            enableSearch
            defaultViewMode="list"
            viewModes={["list"]}
            onRowClick={(row) => {
              window.location.href = `${SUPPORT_ARTICLE_ROUTE_BASE}/${row.id}`;
            }}
            emptyState={
              <div className="text-muted-foreground py-10 text-center text-sm">
                No helpdesk articles yet. Click “New article” to create your
                first entry.
              </div>
            }
          />
        </Card>
      </div>
    </div>
  );
};
