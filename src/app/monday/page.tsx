"use client";

import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCcw,
  Settings,
} from "lucide-react";
import type {
  ColumnDefinition,
  EntityAction,
} from "@acme/ui/entity-list";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@acme/ui/badge";
import { Button } from "@acme/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@acme/ui/dialog";
import { EntityList } from "@acme/ui/entity-list";
import { Input } from "@acme/ui/input";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@acme/ui/tabs";
import { toast } from "@acme/ui/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@acme/ui/tooltip";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

interface MondayRecord extends Record<string, unknown> {
  id: string;
  name: string;
  url: string | null;
  groupTitle: string | null;
  statusText: string | null;
  peopleText: string | null;
  ownerIds: string[];
  email: string | null;
  address: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  contactDetails: {
    label: string;
    value: string;
  }[];
}

interface MondayResponse {
  ok: boolean;
  error?: string;
  boardName?: string | null;
  records?: MondayRecord[];
  nextCursor?: string | null;
}

interface MondayEmailTemplate {
  id: string;
  name: string;
  url: string | null;
  updatedAt: string | null;
  content: string;
  renderedHtml: string;
  docLink: string | null;
}

interface MondayEmailTemplatesResponse {
  ok: boolean;
  error?: string;
  boardName?: string | null;
  boardId?: string;
  workdocColumnId?: string;
  templates?: MondayEmailTemplate[];
}

interface MondayIdentity {
  userId: string;
  accountId: string;
  boardId?: string;
  appClientId?: string;
  expiresAt?: number;
}

interface MondayUserProfileResponse {
  ok: boolean;
  error?: string;
  user?: {
    id: string;
    email: string | null;
    name: string | null;
  } | null;
}

interface MondaySessionSdk {
  get: (key: string) => Promise<{ data?: unknown }>;
}

interface WindowWithMondaySdk extends Window {
  mondaySdk?: () => MondaySessionSdk;
}

const formatUpdatedAt = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const toDateOnly = (value: Date) => {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getMonthBounds = (monthAnchor: Date) => {
  const start = new Date(
    Date.UTC(monthAnchor.getUTCFullYear(), monthAnchor.getUTCMonth(), 1),
  );
  const end = new Date(
    Date.UTC(monthAnchor.getUTCFullYear(), monthAnchor.getUTCMonth() + 1, 0),
  );

  return {
    from: toDateOnly(start),
    to: toDateOnly(end),
    label: start.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
  };
};

const uniqueSorted = (values: (string | null)[]) => {
  return Array.from(new Set(values.filter(Boolean) as string[])).sort((a, b) =>
    a.localeCompare(b),
  );
};

const readTokenFromLocation = () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("sessionToken");
  return token && token.trim().length > 0 ? token.trim() : null;
};

const readTokenFromSdkResponse = (value: unknown) => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  if (typeof value === "object" && value !== null) {
    const maybeData = (value as { data?: unknown }).data;
    if (typeof maybeData === "string" && maybeData.trim().length > 0) {
      return maybeData.trim();
    }
  }
  return null;
};

const getContactTooltipDetails = (record: MondayRecord) => {
  if (Array.isArray(record.contactDetails) && record.contactDetails.length > 0) {
    return record.contactDetails.slice(0, 16);
  }
  return [
    { label: "Name", value: record.name },
    { label: "Email", value: record.email ?? "—" },
    { label: "Address", value: record.address ?? "—" },
    { label: "Owner", value: record.peopleText ?? "—" },
    { label: "Status", value: record.statusText ?? "—" },
  ];
};

export type MondayBoardViewMode = "all" | "userScoped";

interface MondayBoardViewProps {
  viewMode?: MondayBoardViewMode;
}

const ADMIN_OWNER_OVERRIDE_EMAIL = "desmond.tatilian@qcausa.com";

export function MondayBoardView({ viewMode = "all" }: MondayBoardViewProps) {
  const [identity, setIdentity] = useState<MondayIdentity | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [staticMode, setStaticMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeMonth, setActiveMonth] = useState(
    () => new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)),
  );
  const loadMoreAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Activepieces route temporarily swaps token formats via `ap-hsl-vars`.
    // Ensure Monday page always renders with the default app token set.
    document.documentElement.classList.remove("ap-hsl-vars");
  }, []);

  const monthBounds = useMemo(() => getMonthBounds(activeMonth), [activeMonth]);
  const recordsQuery = useInfiniteQuery({
    queryKey: [
      "monday-records",
      monthBounds.from,
      monthBounds.to,
      search,
      statusFilter,
      ownerFilter,
      sessionToken,
    ],
    enabled: !!sessionToken && !staticMode,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (pageParam) params.set("cursor", pageParam);
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter.trim()) params.set("status", statusFilter.trim());
      if (ownerFilter.trim()) params.set("owner", ownerFilter.trim());
      params.set("dateFrom", monthBounds.from);
      params.set("dateTo", monthBounds.to);

      const response = await fetch(`/api/monday/records?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        headers: sessionToken
          ? { "x-monday-session-token": sessionToken }
          : undefined,
      });
      const data = (await response.json()) as MondayResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load Monday records");
      }
      return data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
  });

  const shouldAutoLoadMore =
    !staticMode &&
    search.trim().length === 0 &&
    statusFilter.trim().length === 0 &&
    ownerFilter.trim().length === 0;

  const emailTemplatesQuery = useQuery({
    queryKey: ["monday-email-templates", sessionToken],
    enabled: !!sessionToken && !staticMode,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("boardId", "18401299370");
      params.set("workdocColumnId", "doc_mm0wq4r");
      params.set("limit", "250");

      const response = await fetch(`/api/monday/email-templates?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        headers: sessionToken ? { "x-monday-session-token": sessionToken } : undefined,
      });
      const data = (await response.json()) as MondayEmailTemplatesResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load email templates");
      }
      return data;
    },
    staleTime: 60_000,
  });

  const userProfileQuery = useQuery({
    queryKey: ["monday-user-profile", sessionToken, identity?.userId],
    enabled: !!sessionToken && !!identity?.userId && !staticMode,
    queryFn: async () => {
      const response = await fetch("/api/monday/users/me", {
        method: "GET",
        cache: "no-store",
        headers: sessionToken ? { "x-monday-session-token": sessionToken } : undefined,
      });
      const data = (await response.json()) as MondayUserProfileResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load Monday user profile");
      }
      return data.user ?? null;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ownerParam = params.get("owner");
    const staticParam = params.get("static");

    if (ownerParam && ownerParam.trim().length > 0) {
      setOwnerFilter(ownerParam.trim());
    }
    if (staticParam === "1" || staticParam === "true") {
      setStaticMode(true);
    }
  }, []);

  useEffect(() => {
    const initEmbeddedSession = async () => {
      if (staticMode) {
        setSessionToken("static-mode");
        setIdentity({
          accountId: "static-account",
          userId: "53441186",
        });
        setAuthLoading(false);
        return;
      }

      setAuthLoading(true);
      setIdentity(null);

      try {
        let maybeToken = readTokenFromLocation();

        if (!maybeToken) {
          const sdkFactory = (window as WindowWithMondaySdk).mondaySdk;
          if (!sdkFactory) {
            throw new Error(
              "Monday SDK is not available and no sessionToken query param was found.",
            );
          }

          const sdk = sdkFactory();
          const tokenResponse = await sdk.get("sessionToken");
          maybeToken = readTokenFromSdkResponse(tokenResponse);
        }

        if (!maybeToken) {
          throw new Error("Missing Monday session token from SDK/query string");
        }

        const authResponse = await fetch("/api/monday/auth/session", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-monday-session-token": maybeToken,
          },
          body: JSON.stringify({ sessionToken: maybeToken }),
          cache: "no-store",
        });

        const authData = (await authResponse.json()) as {
          ok: boolean;
          error?: string;
          identity?: MondayIdentity;
        };

        if (!authResponse.ok || !authData.ok || !authData.identity) {
          throw new Error(authData.error ?? "Unable to verify Monday session");
        }

        setSessionToken(maybeToken);
        setIdentity(authData.identity);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to initialize Monday embed session";
        toast.error(message);
      } finally {
        setAuthLoading(false);
      }
    };

    void initEmbeddedSession();
  }, [staticMode]);

  useEffect(() => {
    if (viewMode !== "userScoped") return;
    if (!identity?.userId) return;
    setOwnerFilter(identity.userId);
  }, [identity?.userId, viewMode]);

  useEffect(() => {
    if (staticMode) return;
    if (!recordsQuery.error) return;
    const message =
      recordsQuery.error instanceof Error
        ? recordsQuery.error.message
        : "Unknown loading error";
    toast.error(message);
  }, [recordsQuery.error, staticMode]);

  useEffect(() => {
    if (staticMode) return;
    if (!emailTemplatesQuery.error) return;
    const message =
      emailTemplatesQuery.error instanceof Error
        ? emailTemplatesQuery.error.message
        : "Unknown loading error";
    toast.error(message);
  }, [emailTemplatesQuery.error, staticMode]);

  useEffect(() => {
    if (staticMode) return;
    if (!userProfileQuery.error) return;
    const message =
      userProfileQuery.error instanceof Error
        ? userProfileQuery.error.message
        : "Unknown loading error";
    toast.error(message);
  }, [staticMode, userProfileQuery.error]);

  useEffect(() => {
    const target = loadMoreAnchorRef.current;
    if (!target || !recordsQuery.hasNextPage || !shouldAutoLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (recordsQuery.isFetchingNextPage) return;
        void recordsQuery.fetchNextPage();
      },
      { rootMargin: "300px 0px 300px 0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [recordsQuery, shouldAutoLoadMore]);

  const staticRecords = useMemo<MondayRecord[]>(() => {
    if (!staticMode) return [];
    const statuses = ["New", "Qualified", "Contacted", "Closed"] as const;
    return Array.from({ length: 50 }, (_, index) => {
      const id = String(index + 1);
      const ownerId = index % 3 === 0 ? "53441186" : index % 3 === 1 ? "71234567" : "74561234";
      return {
        id,
        name: `Static Lead ${id}`,
        url: null,
        groupTitle: "Static Group",
        statusText: statuses[index % statuses.length] ?? "New",
        peopleText:
          ownerId === "53441186"
            ? "Current Monday User"
            : ownerId === "71234567"
              ? "Owner Two"
              : "Owner Three",
        ownerIds: [ownerId],
        email: `lead${id}@example.com`,
        address: `${100 + index} Test Ave, Test City`,
        createdAt: new Date(
          Date.UTC(2026, 1, (index % 28) + 1, 12, index % 60, 0),
        ).toISOString(),
        updatedAt: new Date(
          Date.UTC(2026, 1, (index % 28) + 1, 13, index % 60, 0),
        ).toISOString(),
        contactDetails: [
          { label: "Name", value: `Static Lead ${id}` },
          { label: "Email", value: `lead${id}@example.com` },
          { label: "Address", value: `${100 + index} Test Ave, Test City` },
          {
            label: "Owner",
            value:
              ownerId === "53441186"
                ? "Current Monday User"
                : ownerId === "71234567"
                  ? "Owner Two"
                  : "Owner Three",
          },
          { label: "Status", value: statuses[index % statuses.length] ?? "New" },
        ],
      };
    });
  }, [staticMode]);

  const apiRecords = useMemo(() => {
    return (recordsQuery.data?.pages ?? []).flatMap((page) => page.records ?? []);
  }, [recordsQuery.data?.pages]);

  const records = useMemo(() => {
    if (!staticMode) return apiRecords;
    return staticRecords.filter((record) => {
      if (statusFilter.trim().length > 0) {
        if ((record.statusText ?? "").toLowerCase() !== statusFilter.toLowerCase()) {
          return false;
        }
      }
      if (ownerFilter.trim().length > 0) {
        const ownerIdMatch = record.ownerIds
          .map((ownerId) => ownerId.toLowerCase())
          .includes(ownerFilter.toLowerCase());
        const ownerTextMatch = (record.peopleText ?? "").toLowerCase() === ownerFilter.toLowerCase();
        if (!ownerIdMatch && !ownerTextMatch) {
          return false;
        }
      }
      return true;
    });
  }, [apiRecords, ownerFilter, staticMode, staticRecords, statusFilter]);
  const boardName = staticMode
    ? "Static Test Board (50 records)"
    : recordsQuery.data?.pages[0]?.boardName ?? "Monday Board";
  const emailTemplates = useMemo(
    () => (staticMode ? [] : (emailTemplatesQuery.data?.templates ?? [])),
    [emailTemplatesQuery.data?.templates, staticMode],
  );
  const currentUserEmail = userProfileQuery.data?.email?.toLowerCase() ?? null;
  const canOverrideUserScopeOwner =
    viewMode === "userScoped" && currentUserEmail === ADMIN_OWNER_OVERRIDE_EMAIL;
  const isOwnerFilterEditable = viewMode === "all" || canOverrideUserScopeOwner;

  useEffect(() => {
    if (viewMode !== "userScoped") return;
    if (isOwnerFilterEditable) return;
    const scopedOwner = identity?.userId ?? "";
    if (ownerFilter !== scopedOwner) {
      setOwnerFilter(scopedOwner);
    }
  }, [identity?.userId, isOwnerFilterEditable, ownerFilter, viewMode]);

  useEffect(() => {
    if (viewMode !== "userScoped") return;
    if (!canOverrideUserScopeOwner) return;
    if (!identity?.userId) return;
    // For override users (Desmond), default to "all owners" in /monday/user.
    if (ownerFilter === identity.userId) {
      setOwnerFilter("");
    }
  }, [canOverrideUserScopeOwner, identity?.userId, ownerFilter, viewMode]);

  useEffect(() => {
    if (emailTemplates.length === 0) return;
    if (
      selectedTemplateId &&
      emailTemplates.some((template) => template.id === selectedTemplateId)
    ) {
      return;
    }
    setSelectedTemplateId(emailTemplates[0]?.id ?? null);
  }, [emailTemplates, selectedTemplateId]);

  const selectedTemplate = useMemo(() => {
    return (
      emailTemplates.find((template) => template.id === selectedTemplateId) ??
      emailTemplates[0] ??
      null
    );
  }, [emailTemplates, selectedTemplateId]);

  const ownerOptions = useMemo(() => {
    return Array.from(
      new Map(
        records
          .flatMap((record) => {
            const ids = Array.isArray(record.ownerIds) ? record.ownerIds : [];
            return ids.map((id) => ({
              value: id,
              label:
                record.peopleText && record.peopleText.trim().length > 0
                  ? `${record.peopleText} (${id})`
                  : `User ${id}`,
            }));
          })
          .map((entry) => [entry.value, entry.label] as const),
      ),
    )
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [records]);

  const statusOptions = useMemo(() => {
    return uniqueSorted(records.map((record) => record.statusText)).map((value) => ({
      label: value,
      value,
    }));
  }, [records]);

  const columns: ColumnDefinition<MondayRecord>[] = [
    {
      id: "name",
      header: "Item",
      accessorKey: "name",
      cell: (item: MondayRecord) => {
        const details = getContactTooltipDetails(item);
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex cursor-help flex-col gap-1">
                <span className="font-medium">{item.name}</span>
                <span className="text-muted-foreground text-xs">
                  {item.email ?? "No email"}
                </span>
                <span className="text-muted-foreground text-xs">
                  {item.address ?? "No address"}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" align="start" sideOffset={8} className="max-w-md p-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-wide uppercase">Contact details</p>
                <div className="max-h-72 space-y-1 overflow-y-auto">
                  {details.map((detail) => (
                    <div key={`${detail.label}-${detail.value}`} className="grid grid-cols-[100px_1fr] gap-2 text-xs">
                      <span className="text-muted">{detail.label}</span>
                      <span className="wrap-break-word">{detail.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      id: "statusText",
      header: "Status",
      accessorKey: "statusText",
      cell: (item: MondayRecord) =>
        item.statusText ? <Badge variant="secondary">{item.statusText}</Badge> : "—",
    },
    {
      id: "peopleText",
      header: "Owner",
      accessorKey: "peopleText",
      cell: (item: MondayRecord) => item.peopleText ?? "—",
    },
    {
      id: "createdAt",
      header: "Created at",
      accessorKey: "createdAt",
      sortable: true,
      cell: (item: MondayRecord) => formatUpdatedAt(item.createdAt),
    },
    {
      id: "updatedAt",
      header: "Updated",
      accessorKey: "updatedAt",
      sortable: true,
      cell: (item: MondayRecord) => formatUpdatedAt(item.updatedAt),
    },
  ];

  const entityActions: EntityAction<MondayRecord>[] = [
    {
      id: "open",
      label: "Open",
      icon: <ExternalLink className="h-4 w-4" />,
      variant: "outline",
      onClick: (record) => {
        if (!record.url) return;
        window.open(record.url, "_blank", "noopener,noreferrer");
      },
      isDisabled: (record) => !record.url,
    },

  ];

  return (
    <div className="container mx-auto max-w-[1600px] space-y-4 py-6">
      {identity ? (
        <div className="text-muted-foreground text-xs">
          Connected account: {identity.accountId} · user: {identity.userId} · board:{" "}
          {boardName}
          {staticMode ? " · static mode" : ""}
          {viewMode === "userScoped" && !isOwnerFilterEditable
            ? " · owner scope locked to current user"
            : ""}
          {canOverrideUserScopeOwner ? " · owner scope override enabled" : ""}
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search records..."
            className="max-w-md"
          />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setActiveMonth(
                  (prev) =>
                    new Date(
                      Date.UTC(
                        prev.getUTCFullYear(),
                        prev.getUTCMonth() - 1,
                        1,
                      ),
                    ),
                );
              }}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Prev month
            </Button>
            <Badge variant="outline">{monthBounds.label}</Badge>
            <Button
              variant="outline"
              onClick={() => {
                setActiveMonth(
                  (prev) =>
                    new Date(
                      Date.UTC(
                        prev.getUTCFullYear(),
                        prev.getUTCMonth() + 1,
                        1,
                      ),
                    ),
                );
              }}
            >
              Next month
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 overflow-x-auto whitespace-nowrap pb-1 *:shrink-0">
          <select
            value={ownerFilter || "__all_owner__"}
            onChange={(event) => {
              if (!isOwnerFilterEditable) return;
              const value = event.target.value;
              setOwnerFilter(value === "__all_owner__" ? "" : value);
            }}
            className="bg-background border-input h-9 w-[260px] rounded-md border px-3 text-sm"
            disabled={!isOwnerFilterEditable}
          >
            {isOwnerFilterEditable ? (
              <option value="__all_owner__">Owner: all</option>
            ) : (
              <option value={identity?.userId ?? "__all_owner__"}>Owner: me</option>
            )}
            {ownerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter || "__all_status__"}
            onChange={(event) => {
              const value = event.target.value;
              setStatusFilter(value === "__all_status__" ? "" : value);
            }}
            className="bg-background border-input h-9 w-[220px] rounded-md border px-3 text-sm"
          >
            <option value="__all_status__">Status: all</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            onClick={() => {
              if (staticMode) return;
              void recordsQuery.refetch();
            }}
            disabled={staticMode || recordsQuery.isFetching}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Reload
          </Button>
          {!staticMode && recordsQuery.hasNextPage ? (
            <Button
              variant="secondary"
              onClick={() => {
                void recordsQuery.fetchNextPage();
              }}
              disabled={recordsQuery.isFetchingNextPage}
            >
              {recordsQuery.isFetchingNextPage ? "Loading..." : "Load more"}
            </Button>
          ) : null}
          <Button asChild variant="ghost">
            <Link
              href="https://developer.monday.com/api-reference/reference/items-page"
              target="_blank"
              rel="noreferrer"
            >
              API docs
            </Link>
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Monday Settings</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="email-templates" className="flex gap-4">
                <TabsList className="h-auto w-56 shrink-0 flex-col items-stretch">
                  <TabsTrigger
                    value="email-templates"
                    className="w-full justify-start text-left"
                  >
                    Email Templates
                  </TabsTrigger>
                  <TabsTrigger
                    value="user-zip-map"
                    className="w-full justify-start text-left"
                  >
                    User {"<->"} Zipcode map
                  </TabsTrigger>
                </TabsList>
                <div className="min-h-80 flex-1 rounded-md border p-4">
                  <TabsContent value="email-templates" className="mt-0">
                    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">
                          Templates ({emailTemplates.length})
                        </p>
                        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                          {emailTemplates.map((template) => {
                            const isActive = template.id === selectedTemplate?.id;
                            return (
                              <button
                                key={template.id}
                                type="button"
                                className={[
                                  "w-full rounded-md border px-3 py-2 text-left text-sm transition-colors",
                                  isActive
                                    ? "border-primary bg-primary/10"
                                    : "hover:bg-muted/60",
                                ].join(" ")}
                                onClick={() => {
                                  setSelectedTemplateId(template.id);
                                }}
                              >
                                <p className="line-clamp-1 font-medium">{template.name}</p>
                                <p className="text-muted-foreground mt-1 text-xs">
                                  Updated {formatUpdatedAt(template.updatedAt)}
                                </p>
                              </button>
                            );
                          })}
                          {emailTemplates.length === 0 && !emailTemplatesQuery.isLoading ? (
                            <p className="text-muted-foreground text-sm">
                              No templates found on board 18401299370.
                            </p>
                          ) : null}
                          {emailTemplatesQuery.isLoading ? (
                            <p className="text-muted-foreground text-sm">
                              Loading templates...
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="bg-background min-h-[420px] rounded-md border p-4">
                        {selectedTemplate ? (
                          <div className="space-y-4">
                            <div className="border-b pb-3">
                              <p className="text-xs font-semibold tracking-wide uppercase">
                                Subject
                              </p>
                              <p className="mt-1 text-base font-medium">
                                {selectedTemplate.name}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold tracking-wide uppercase">
                                Email Preview (Lead View)
                              </p>
                              <div className="bg-card mt-2 rounded-md border p-4">
                                {selectedTemplate.content.trim().length === 0 ? (
                                  <p className="text-muted-foreground text-sm">
                                    No content found in column doc_mm0wq4r.
                                  </p>
                                ) : selectedTemplate.renderedHtml.trim().length > 0 ? (
                                  <div
                                    className="prose prose-sm dark:prose-invert max-w-none"
                                    dangerouslySetInnerHTML={{
                                      __html: selectedTemplate.renderedHtml,
                                    }}
                                  />
                                ) : (
                                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                    {selectedTemplate.content}
                                  </div>
                                )}
                                {selectedTemplate.docLink ? (
                                  <p className="mt-3 text-xs">
                                    <a
                                      href={selectedTemplate.docLink}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-primary underline underline-offset-2"
                                    >
                                      Open source Monday Workdoc
                                    </a>
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            Select an email template to preview.
                          </p>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="user-zip-map" className="mt-0">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">User {"<->"} Zipcode map</p>
                      <p className="text-muted-foreground text-sm">
                        Define zipcode ownership and routing by user.
                      </p>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <EntityList<MondayRecord>
        // title="Board Records"
        // description="List view optimized for board operations."
        data={records}
        columns={columns}
        hideFilters
        isLoading={authLoading || (!staticMode && recordsQuery.isLoading)}
        enableSearch={false}
        viewModes={[]}
        defaultViewMode="list"
        initialSort={{ id: "createdAt", direction: "desc" }}
        getRowId={(item) => item.id}
        entityActions={entityActions}
      />
      {!staticMode && recordsQuery.hasNextPage ? (
        <div ref={loadMoreAnchorRef} className="h-10" />
      ) : null}
    </div>
  );
}

export default function MondayBoardPage() {
  return <MondayBoardView viewMode="all" />;
}
