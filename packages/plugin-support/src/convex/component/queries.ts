import { v } from "convex/values";

import { components } from "./_generated/api";
import { query } from "./_generated/server";
import {
  assertWidgetAccess,
  getWidgetChatSettings,
  listSupportOptionsMap,
  organizationMatches,
} from "./helpers";

const resolveConversation = async (
  ctx: any,
  args: { organizationId: string; threadId?: string; sessionId?: string },
) => {
  const resolved = args.threadId ?? args.sessionId;
  if (!resolved) return null;
  const byThread = args.threadId
    ? await ctx.db
        .query("supportConversations")
        .withIndex("by_org_agentThreadId", (q: any) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("agentThreadId", resolved),
        )
        .first()
    : null;
  const bySession = !byThread
    ? await ctx.db
        .query("supportConversations")
        .withIndex("by_org_session", (q: any) =>
          q.eq("organizationId", args.organizationId).eq("sessionId", resolved),
        )
        .first()
    : null;
  return byThread ?? bySession ?? null;
};

const buildPresenceRoomId = (organizationId: string, threadOrSessionId: string) =>
  `support:${organizationId}:${threadOrSessionId.trim()}`;

const normalizeAgentPresenceUserId = (agentUserId: string) =>
  agentUserId.startsWith("agent:") ? agentUserId : `agent:${agentUserId}`;

export const listSupportPosts = query({
  args: {
    organizationId: v.string(),
    filters: v.optional(
      v.object({
        status: v.optional(
          v.union(
            v.literal("published"),
            v.literal("draft"),
            v.literal("archived"),
          ),
        ),
        postTypeSlug: v.optional(v.string()),
        parentId: v.optional(v.id("posts")),
        limit: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const orgId = args.organizationId;
    const postTypeSlug = args.filters?.postTypeSlug?.toLowerCase();
    const parentId = args.filters?.parentId;

    let qb;
    if (parentId) {
      qb = ctx.db
        .query("posts")
        .withIndex("by_org_parent", (q) =>
          q.eq("organizationId", orgId).eq("parentId", parentId),
        );
    } else if (postTypeSlug) {
      qb = ctx.db
        .query("posts")
        .withIndex("by_org_postTypeSlug", (q) =>
          q.eq("organizationId", orgId).eq("postTypeSlug", postTypeSlug),
        );
    } else {
      qb = ctx.db
        .query("posts")
        .withIndex("by_org", (q) => q.eq("organizationId", orgId));
    }

    if (args.filters?.status) {
      qb = qb.filter((q) => q.eq(q.field("status"), args.filters?.status));
    }

    const posts = await qb.order("desc").take(args.filters?.limit ?? 200);
    return posts;
  },
});

export const getSupportPostById = query({
  args: {
    id: v.id("posts"),
    organizationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.id);
    if (!post) return null;
    if (
      !organizationMatches(
        post.organizationId ?? undefined,
        args.organizationId ?? undefined,
      )
    ) {
      return null;
    }
    return post;
  },
});

export const getSupportPostMeta = query({
  args: {
    postId: v.id("posts"),
    organizationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) return [];
    if (
      !organizationMatches(
        post.organizationId ?? undefined,
        args.organizationId ?? undefined,
      )
    ) {
      return [];
    }

    return await ctx.db
      .query("postsMeta")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();
  },
});

export const getSupportOption = query({
  args: {
    organizationId: v.string(),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("options")
      .withIndex("by_org_key", (q) =>
        q.eq("organizationId", args.organizationId).eq("key", args.key),
      )
      .unique();
    if (!existing) return null;
    return {
      key: existing.key,
      value: existing.value ?? null,
      updatedAt: existing.updatedAt ?? existing.createdAt,
    };
  },
});

export const listSupportOptions = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const options = await ctx.db
      .query("options")
      .withIndex("by_org_key", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .collect();
    return options.map((opt) => ({
      key: opt.key,
      value: opt.value ?? null,
      updatedAt: opt.updatedAt ?? opt.createdAt,
    }));
  },
});

export const listSupportCannedResponses = query({
  args: {
    organizationId: v.string(),
    includeInactive: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id("supportCannedResponses"),
      _creationTime: v.number(),
      organizationId: v.string(),
      title: v.string(),
      body: v.string(),
      channels: v.array(v.union(v.literal("chat"), v.literal("email"))),
      isActive: v.boolean(),
      sortOrder: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const includeInactive = args.includeInactive ?? false;
    const rows = includeInactive
      ? await ctx.db
          .query("supportCannedResponses")
          .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
          .collect()
      : await ctx.db
          .query("supportCannedResponses")
          .withIndex("by_org_active", (q) =>
            q.eq("organizationId", args.organizationId).eq("isActive", true),
          )
          .collect();

    return rows.sort((a, b) => {
      const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return b.updatedAt - a.updatedAt;
    });
  },
});

export const getEmailSettingsByAliasLocalPart = query({
  args: {
    aliasLocalPart: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      organizationId: v.string(),
      defaultAlias: v.string(),
      inboundAlias: v.string(),
      allowEmailIntake: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const aliasLocalPart = args.aliasLocalPart.trim().toLowerCase();
    if (!aliasLocalPart) return null;

    const aliasOptions = await ctx.db
      .query("options")
      .withIndex("by_key", (q) => q.eq("key", "defaultAlias"))
      .collect();

    for (const entry of aliasOptions) {
      if (typeof entry.value !== "string") continue;
      const defaultAlias = entry.value.trim().toLowerCase();
      if (!defaultAlias) continue;
      const localPart = defaultAlias.split("@")[0]?.trim().toLowerCase();
      if (!localPart || localPart !== aliasLocalPart) continue;

      const allowEmailIntakeOption = await ctx.db
        .query("options")
        .withIndex("by_org_key", (q) =>
          q
            .eq("organizationId", entry.organizationId)
            .eq("key", "allowEmailIntake"),
        )
        .unique();
      const allowEmailIntake = Boolean(allowEmailIntakeOption?.value);
      if (!allowEmailIntake) continue;

      return {
        organizationId: entry.organizationId,
        defaultAlias,
        inboundAlias: localPart,
        allowEmailIntake,
      };
    }

    return null;
  },
});

// ------------------------------
// Support operational queries
// ------------------------------

export const listConversations = query({
  args: {
    organizationId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 200;
    const rows = await ctx.db
      .query("supportConversations")
      .withIndex("by_org_lastMessageAt", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .order("desc")
      .take(limit);

    // Dedupe: historically we could end up with multiple rows pointing at the same
    // agent thread id (e.g. one row keyed by clientSessionId + one keyed by agentThreadId).
    // Keep the first one (newest) since we’re sorted by lastMessageAt desc.
    const seen = new Set<string>();
    const result: any[] = [];
    for (const row of rows as any[]) {
      const threadId = row.agentThreadId ?? row.sessionId;
      const key = String(threadId ?? "");
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push({
        threadId,
        sessionId: row.sessionId,
        lastMessage: row.lastMessageSnippet ?? undefined,
        lastRole: row.lastMessageAuthor ?? undefined,
        lastAt: row.lastMessageAt ?? undefined,
        firstAt: row.firstMessageAt ?? undefined,
        totalMessages: row.totalMessages ?? undefined,
        contactId: typeof row.contactId === "string" ? row.contactId : undefined,
        contactName: row.contactName ?? undefined,
        contactEmail: row.contactEmail ?? undefined,
        origin: row.origin ?? undefined,
        status: row.status ?? undefined,
        mode: row.mode ?? undefined,
        assignedAgentId: row.assignedAgentId ?? undefined,
        assignedAgentName: row.assignedAgentName ?? undefined,
        agentThreadId: row.agentThreadId ?? undefined,
        // Back-compat: callers historically used this only as an opaque reference.
        postId: threadId,
      });
    }
    return result;
  },
});

export const getConversationIndex = query({
  args: {
    organizationId: v.string(),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await resolveConversation(ctx, args);
  },
});

export const listConversationNotes = query({
  args: {
    organizationId: v.string(),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const convo = await resolveConversation(ctx, args);
    if (!convo) return [];
    const rows = await ctx.db
      .query("supportConversationNotes")
      .withIndex("by_org_session_createdAt", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("sessionId", convo.sessionId),
      )
      .order("desc")
      .take(200);
    return rows.map((row: any) => ({
      _id: String(row._id),
      note: row.note,
      actorId: row.actorId ?? undefined,
      actorName: row.actorName ?? undefined,
      createdAt: row.createdAt,
    }));
  },
});

export const listConversationEvents = query({
  args: {
    organizationId: v.string(),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const convo = await resolveConversation(ctx, args);
    if (!convo) return [];
    const rows = await ctx.db
      .query("supportConversationEvents")
      .withIndex("by_org_session_createdAt", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("sessionId", convo.sessionId),
      )
      .order("desc")
      .take(200);
    return rows.map((row: any) => ({
      _id: String(row._id),
      eventType: row.eventType,
      actorId: row.actorId ?? undefined,
      actorName: row.actorName ?? undefined,
      payload: row.payload ?? undefined,
      createdAt: row.createdAt,
    }));
  },
});

export const supportPresenceList = query({
  args: {
    roomToken: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.presence.public.list, {
      roomToken: args.roomToken,
      limit: args.limit,
    });
  },
});

export const listPresenceRoom = query({
  args: {
    roomId: v.string(),
    onlineOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.presence.public.listRoom, {
      roomId: args.roomId,
      onlineOnly: args.onlineOnly,
      limit: args.limit,
    });
  },
});

export const getAgentPresence = query({
  args: {
    organizationId: v.string(),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resolved = args.threadId ?? args.sessionId;
    if (!resolved) return null;

    const roomId = buildPresenceRoomId(args.organizationId, resolved);
    const roomPresence = (await ctx.runQuery(components.presence.public.listRoom, {
      roomId,
      onlineOnly: true,
      limit: 200,
    })) as Array<{ userId?: string }> | null;
    const rows = Array.isArray(roomPresence) ? roomPresence : [];

    const typingEntry = rows.find(
      (entry) =>
        typeof entry.userId === "string" &&
        entry.userId.startsWith("typing:agent:"),
    );
    const onlineAgentEntry = rows.find(
      (entry) =>
        typeof entry.userId === "string" && entry.userId.startsWith("agent:"),
    );

    if (!typingEntry && !onlineAgentEntry) return null;

    const candidateUserId =
      typeof typingEntry?.userId === "string"
        ? typingEntry.userId.replace(/^typing:/, "")
        : onlineAgentEntry?.userId;
    if (!candidateUserId) return null;

    const conversation = await resolveConversation(ctx, args);
    const normalizedUserId = normalizeAgentPresenceUserId(candidateUserId);
    const inferredAgentName =
      conversation?.assignedAgentName ??
      normalizedUserId.replace(/^agent:/, "").replace(/[-_]+/g, " ");

    return {
      _id: `${roomId}:${normalizedUserId}`,
      _creationTime: 0,
      organizationId: args.organizationId,
      threadId: resolved,
      agentUserId: normalizedUserId,
      agentName: inferredAgentName || undefined,
      status: typingEntry ? "typing" : "idle",
      updatedAt: undefined,
    };
  },
});

export const getConversationMode = query({
  args: {
    organizationId: v.string(),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const convo = await resolveConversation(ctx, args);
    return (convo?.mode as "agent" | "manual" | undefined) ?? "agent";
  },
});

export const listRagSources = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const postTypeSources = await ctx.db
      .query("supportRagSources")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("sourceType", "postType"),
      )
      .collect();
    const lmsSources = await ctx.db
      .query("supportRagSources")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("sourceType", "lmsPostType"),
      )
      .collect();

    return [...postTypeSources, ...lmsSources].map((source: any) => ({
      _id: source._id,
      _creationTime: source._creationTime,
      postTypeSlug: source.postTypeSlug,
      sourceType: source.sourceType,
      displayName: source.displayName,
      isEnabled: source.isEnabled,
      includeTags: source.includeTags,
      metaFieldKeys: source.metaFieldKeys ?? [],
      additionalMetaKeys: source.additionalMetaKeys,
      fields: source.fields,
      useCustomBaseInstructions: source.useCustomBaseInstructions ?? false,
      baseInstructions: source.baseInstructions ?? "",
    }));
  },
});

export const listRagSourceRecords = query({
  args: {
    organizationId: v.string(),
    sourceId: v.id("supportRagSources"),
    limit: v.optional(v.number()),
    includeHistorical: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId);
    if (!source || source.organizationId !== args.organizationId) {
      return {
        source: null,
        records: [],
      };
    }

    const limit = Math.max(1, Math.min(args.limit ?? 500, 2000));
    const statuses = await ctx.db
      .query("supportRagIndexStatus")
      .withIndex("by_org_sourceType_postType", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("sourceType", source.sourceType)
          .eq("postTypeSlug", source.postTypeSlug),
      )
      .collect();

    const includeHistorical = args.includeHistorical ?? false;
    const visibleStatuses = includeHistorical
      ? statuses
      : statuses.filter((row) => row.lastStatus !== "deleted");

    const records = visibleStatuses
      .sort(
        (a, b) =>
          (b.lastAttemptAt ?? b._creationTime ?? 0) -
          (a.lastAttemptAt ?? a._creationTime ?? 0),
      )
      .slice(0, limit)
      .map((row) => ({
        _id: row._id,
        postId: row.postId,
        entryKey: row.entryKey,
        lastStatus: row.lastStatus,
        lastAttemptAt: row.lastAttemptAt,
        lastSuccessAt: row.lastSuccessAt,
        lastError: row.lastError,
        lastEntryId: row.lastEntryId,
        lastEntryStatus: row.lastEntryStatus,
      }));

    return {
      source: {
        _id: source._id,
        postTypeSlug: source.postTypeSlug,
        sourceType: source.sourceType,
        displayName: source.displayName,
        isEnabled: source.isEnabled,
        lastIndexedAt: source.lastIndexedAt,
      },
      records,
    };
  },
});

export const getRagSourceConfigForPostType = query({
  args: {
    organizationId: v.string(),
    postTypeSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const postTypeSlug = args.postTypeSlug.toLowerCase().trim();
    if (!postTypeSlug) return null;

    const lmsConfig = await ctx.db
      .query("supportRagSources")
      .withIndex("by_org_type_and_postTypeSlug", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("sourceType", "lmsPostType")
          .eq("postTypeSlug", postTypeSlug),
      )
      .unique();

    const postConfig =
      lmsConfig ??
      (await ctx.db
        .query("supportRagSources")
        .withIndex("by_org_type_and_postTypeSlug", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("sourceType", "postType")
            .eq("postTypeSlug", postTypeSlug),
        )
        .unique());

    if (!postConfig) return null;

    return {
      _id: postConfig._id,
      postTypeSlug: postConfig.postTypeSlug,
      sourceType: postConfig.sourceType,
      isEnabled: postConfig.isEnabled,
      useCustomBaseInstructions: postConfig.useCustomBaseInstructions ?? false,
      baseInstructions: postConfig.baseInstructions ?? "",
    };
  },
});

export const getRagIndexStatusForPost = query({
  args: {
    organizationId: v.string(),
    postTypeSlug: v.string(),
    postId: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedPostTypeSlug = args.postTypeSlug.toLowerCase();

    const lmsConfig = await ctx.db
      .query("supportRagSources")
      .withIndex("by_org_type_and_postTypeSlug", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("sourceType", "lmsPostType")
          .eq("postTypeSlug", normalizedPostTypeSlug),
      )
      .unique();

    const postConfig =
      lmsConfig ??
      (await ctx.db
        .query("supportRagSources")
        .withIndex("by_org_type_and_postTypeSlug", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("sourceType", "postType")
            .eq("postTypeSlug", normalizedPostTypeSlug),
        )
        .unique());

    if (!postConfig?.isEnabled) {
      return { isEnabledForPostType: false };
    }

    const sourceType = postConfig.sourceType;
    const entryKey =
      sourceType === "lmsPostType"
        ? `lms:${normalizedPostTypeSlug}:${args.postId}`
        : `post:${args.postId}`;

    const status = await ctx.db
      .query("supportRagIndexStatus")
      .withIndex("by_org_post", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("postTypeSlug", normalizedPostTypeSlug)
          .eq("postId", args.postId),
      )
      .unique();

    return {
      isEnabledForPostType: true,
      sourceType,
      entryKey,
      lastStatus: status?.lastStatus,
      lastAttemptAt: status?.lastAttemptAt,
      lastSuccessAt: status?.lastSuccessAt,
      lastError: status?.lastError,
      lastEntryId: status?.lastEntryId,
      lastEntryStatus: status?.lastEntryStatus,
      config: {
        displayName: postConfig.displayName,
        fields: postConfig.fields,
        includeTags: postConfig.includeTags,
        metaFieldKeys: postConfig.metaFieldKeys,
        additionalMetaKeys: postConfig.additionalMetaKeys,
        lastIndexedAt: postConfig.lastIndexedAt,
      },
    };
  },
});

export const getRagSourceForPostType = query({
  args: {
    organizationId: v.string(),
    postTypeSlug: v.string(),
    sourceType: v.union(v.literal("postType"), v.literal("lmsPostType")),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("supportRagSources")
      .withIndex("by_org_type_and_postTypeSlug", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("sourceType", args.sourceType)
          .eq("postTypeSlug", args.postTypeSlug.toLowerCase()),
      )
      .unique();
    if (!doc) {
      return null;
    }
    return {
      _id: doc._id,
      postTypeSlug: doc.postTypeSlug,
      displayName: doc.displayName,
      isEnabled: doc.isEnabled,
      includeTags: doc.includeTags,
      metaFieldKeys: doc.metaFieldKeys,
      additionalMetaKeys: doc.additionalMetaKeys,
      fields: doc.fields,
      useCustomBaseInstructions: doc.useCustomBaseInstructions,
      baseInstructions: doc.baseInstructions,
      lastIndexedAt: doc.lastIndexedAt,
      sourceType: doc.sourceType,
    };
  },
});

export const getRagSourceForPostTypeAny = query({
  args: {
    organizationId: v.string(),
    postTypeSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const slug = args.postTypeSlug.toLowerCase();
    const lmsConfig = await ctx.db
      .query("supportRagSources")
      .withIndex("by_org_type_and_postTypeSlug", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("sourceType", "lmsPostType")
          .eq("postTypeSlug", slug),
      )
      .unique();

    const postConfig =
      lmsConfig ??
      (await ctx.db
        .query("supportRagSources")
        .withIndex("by_org_type_and_postTypeSlug", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("sourceType", "postType")
            .eq("postTypeSlug", slug),
        )
        .unique());

    if (!postConfig) {
      return null;
    }

    return {
      _id: postConfig._id,
      postTypeSlug: postConfig.postTypeSlug,
      sourceType: postConfig.sourceType,
      isEnabled: postConfig.isEnabled,
      fields: postConfig.fields,
      includeTags: postConfig.includeTags,
      metaFieldKeys: postConfig.metaFieldKeys,
      additionalMetaKeys: postConfig.additionalMetaKeys,
      displayName: postConfig.displayName,
      useCustomBaseInstructions: postConfig.useCustomBaseInstructions,
      baseInstructions: postConfig.baseInstructions,
      lastIndexedAt: postConfig.lastIndexedAt,
    };
  },
});

const parseEventPayload = (payload: unknown): Record<string, unknown> => {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  if (typeof payload === "string") {
    try {
      const parsed = JSON.parse(payload) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }
  return {};
};

const resolveWidgetThreadId = async (
  ctx: any,
  args: {
    organizationId: string;
    clientSessionId?: string;
    contactId?: string;
    contactEmail?: string;
    threadId?: string;
    sessionId?: string;
  },
) => {
  const directResolved = args.threadId?.trim() || args.sessionId?.trim();
  if (directResolved) {
    const conversation = await resolveConversation(ctx, {
      organizationId: args.organizationId,
      threadId: directResolved,
      sessionId: directResolved,
    });
    return (
      conversation?.agentThreadId?.trim() ||
      conversation?.sessionId?.trim() ||
      directResolved
    );
  }

  const normalizedSessionId = args.clientSessionId?.trim();
  if (normalizedSessionId) {
    const bySession = await resolveConversation(ctx, {
      organizationId: args.organizationId,
      sessionId: normalizedSessionId,
    });
    const sessionThreadId =
      bySession?.agentThreadId?.trim() || bySession?.sessionId?.trim();
    if (sessionThreadId) {
      return sessionThreadId;
    }
  }

  const normalizedContactId = args.contactId?.trim();
  const normalizedContactEmail = args.contactEmail?.trim().toLowerCase();
  if (!normalizedContactId && !normalizedContactEmail) {
    return null;
  }

  const rows = await ctx.db
    .query("supportConversations")
    .withIndex("by_org_lastMessageAt", (q: any) =>
      q.eq("organizationId", args.organizationId),
    )
    .order("desc")
    .take(500);
  const byContact = (rows as Array<Record<string, unknown>>).find((row) => {
    if (
      normalizedContactId &&
      typeof row.contactId === "string" &&
      row.contactId === normalizedContactId
    ) {
      return true;
    }

    if (
      normalizedContactEmail &&
      typeof row.contactEmail === "string" &&
      row.contactEmail.trim().toLowerCase() === normalizedContactEmail
    ) {
      return true;
    }

    return false;
  });
  const contactThreadId =
    (typeof byContact?.agentThreadId === "string"
      ? byContact.agentThreadId
      : undefined) ||
    (typeof byContact?.sessionId === "string" ? byContact.sessionId : undefined);
  return contactThreadId?.trim() || null;
};

const listWidgetMessagesForThread = async (
  ctx: any,
  args: {
    organizationId: string;
    threadId: string;
    limit?: number;
  },
) => {
  const conversation =
    (await resolveConversation(ctx, {
      organizationId: args.organizationId,
      threadId: args.threadId,
      sessionId: args.threadId,
    })) ??
    (await resolveConversation(ctx, {
      organizationId: args.organizationId,
      sessionId: args.threadId,
    }));
  if (!conversation) return [];

  const limit = Math.max(1, Math.min(args.limit ?? 500, 1000));
  const rows = await ctx.db
    .query("supportConversationEvents")
    .withIndex("by_org_session_createdAt", (q: any) =>
      q
        .eq("organizationId", args.organizationId)
        .eq("sessionId", conversation.sessionId),
    )
    .order("desc")
    .take(limit);

  return (rows as Array<Record<string, unknown>>)
    .filter((event) => event.eventType === "message")
    .map((event) => {
      const payload = parseEventPayload(event.payload);
      const role: "user" | "assistant" =
        payload.role === "assistant" ? "assistant" : "user";
      const content =
        typeof payload.content === "string" ? payload.content.trim() : "";
      if (!content) {
        return null;
      }
      const messageType: "chat" | "email_inbound" | "email_outbound" =
        payload.messageType === "chat" ||
        payload.messageType === "email_inbound" ||
        payload.messageType === "email_outbound"
          ? payload.messageType
          : "chat";
      return {
        _id: String(event._id ?? ""),
        role,
        content,
        createdAt:
          typeof event.createdAt === "number" ? event.createdAt : Date.now(),
        messageType,
        agentName:
          typeof payload.agentName === "string" ? payload.agentName : undefined,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((a, b) => a.createdAt - b.createdAt);
};

const listWidgetHelpdeskArticlesInternal = async (
  ctx: any,
  args: {
    organizationId: string;
    query?: string;
    limit?: number;
  },
) => {
  const limit = Math.max(1, Math.min(args.limit ?? 6, 50));
  const rows = await ctx.db
    .query("posts")
    .withIndex("by_org_postTypeSlug", (q: any) =>
      q.eq("organizationId", args.organizationId).eq("postTypeSlug", "helpdeskarticles"),
    )
    .order("desc")
    .take(200);

  const normalizedQuery = args.query?.trim().toLowerCase();
  return (rows as Array<Record<string, unknown>>)
    .filter((row) => row.status === "published")
    .filter((row) => {
      if (!normalizedQuery) return true;
      const haystack = [
        typeof row.title === "string" ? row.title : "",
        typeof row.excerpt === "string" ? row.excerpt : "",
        typeof row.content === "string" ? row.content : "",
      ]
        .join("\n")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    })
    .slice(0, limit)
    .map((row) => ({
      id: String(row._id ?? ""),
      title: typeof row.title === "string" ? row.title : "Untitled article",
      summary:
        typeof row.excerpt === "string"
          ? row.excerpt
          : typeof row.content === "string"
            ? row.content.slice(0, 180)
            : "",
      updatedAt: new Date(
        typeof row.updatedAt === "number"
          ? row.updatedAt
          : typeof row._creationTime === "number"
            ? row._creationTime
            : Date.now(),
      ).toISOString(),
      slug: typeof row.slug === "string" ? row.slug : undefined,
    }));
};

export const widgetGetSettings = query({
  args: {
    organizationId: v.string(),
    widgetKey: v.string(),
    requestOrigin: v.optional(v.string()),
    requestHost: v.optional(v.string()),
  },
  returns: v.object({
    settings: v.object({
      requireContact: v.boolean(),
      loggedInUsersAutocapture: v.boolean(),
      fields: v.object({
        fullName: v.boolean(),
        email: v.boolean(),
        phone: v.boolean(),
        company: v.boolean(),
      }),
      introHeadline: v.string(),
      welcomeMessage: v.string(),
      privacyMessage: v.string(),
      autoRespondToThreads: v.boolean(),
    }),
    allowedOrigins: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const { allowedOrigins } = await assertWidgetAccess(ctx, args);
    const options = await listSupportOptionsMap(ctx, args.organizationId);
    return {
      settings: getWidgetChatSettings(options),
      allowedOrigins,
    };
  },
});

export const widgetResolveThread = query({
  args: {
    organizationId: v.string(),
    widgetKey: v.string(),
    requestOrigin: v.optional(v.string()),
    requestHost: v.optional(v.string()),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    clientSessionId: v.optional(v.string()),
    contactId: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
  },
  returns: v.union(
    v.null(),
    v.object({
      threadId: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    await assertWidgetAccess(ctx, args);
    const threadId = await resolveWidgetThreadId(ctx, args);
    if (!threadId) return null;
    return { threadId };
  },
});

export const widgetListMessages = query({
  args: {
    organizationId: v.string(),
    widgetKey: v.string(),
    requestOrigin: v.optional(v.string()),
    requestHost: v.optional(v.string()),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.string(),
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      createdAt: v.number(),
      messageType: v.optional(
        v.union(
          v.literal("chat"),
          v.literal("email_inbound"),
          v.literal("email_outbound"),
        ),
      ),
      agentName: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    await assertWidgetAccess(ctx, args);
    const threadId = (args.threadId ?? args.sessionId)?.trim();
    if (!threadId) return [];
    return await listWidgetMessagesForThread(ctx, {
      organizationId: args.organizationId,
      threadId,
      limit: args.limit,
    });
  },
});

export const widgetListHelpdeskArticles = query({
  args: {
    organizationId: v.string(),
    widgetKey: v.string(),
    requestOrigin: v.optional(v.string()),
    requestHost: v.optional(v.string()),
    query: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      id: v.string(),
      title: v.string(),
      summary: v.string(),
      updatedAt: v.string(),
      slug: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    await assertWidgetAccess(ctx, args);
    return await listWidgetHelpdeskArticlesInternal(ctx, {
      organizationId: args.organizationId,
      query: args.query,
      limit: args.limit,
    });
  },
});

export const widgetPresenceList = query({
  args: {
    organizationId: v.string(),
    widgetKey: v.string(),
    requestOrigin: v.optional(v.string()),
    requestHost: v.optional(v.string()),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    onlineOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      userId: v.string(),
      online: v.optional(v.boolean()),
      data: v.optional(v.any()),
      name: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    await assertWidgetAccess(ctx, args);
    const resolvedThreadId = (args.threadId ?? args.sessionId)?.trim();
    if (!resolvedThreadId) return [];
    const roomId = buildPresenceRoomId(args.organizationId, resolvedThreadId);
    const rows = await ctx.runQuery(components.presence.public.listRoom, {
      roomId,
      onlineOnly: args.onlineOnly,
      limit: args.limit,
    });
    return (rows as Array<Record<string, unknown>>).map((row) => ({
      userId: String(row.userId ?? ""),
      online: typeof row.online === "boolean" ? row.online : undefined,
      data:
        row.data && typeof row.data === "object" && !Array.isArray(row.data)
          ? (row.data as Record<string, unknown>)
          : undefined,
      name: typeof row.name === "string" ? row.name : undefined,
    }));
  },
});

export const widgetBootstrap = query({
  args: {
    organizationId: v.string(),
    widgetKey: v.string(),
    requestOrigin: v.optional(v.string()),
    requestHost: v.optional(v.string()),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    clientSessionId: v.optional(v.string()),
    contactId: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    settings: v.object({
      requireContact: v.boolean(),
      loggedInUsersAutocapture: v.boolean(),
      fields: v.object({
        fullName: v.boolean(),
        email: v.boolean(),
        phone: v.boolean(),
        company: v.boolean(),
      }),
      introHeadline: v.string(),
      welcomeMessage: v.string(),
      privacyMessage: v.string(),
      autoRespondToThreads: v.boolean(),
    }),
    threadId: v.optional(v.string()),
    messages: v.array(
      v.object({
        _id: v.string(),
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
        createdAt: v.number(),
        messageType: v.optional(
          v.union(
            v.literal("chat"),
            v.literal("email_inbound"),
            v.literal("email_outbound"),
          ),
        ),
        agentName: v.optional(v.string()),
      }),
    ),
    helpdeskArticles: v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        summary: v.string(),
        updatedAt: v.string(),
        slug: v.optional(v.string()),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    await assertWidgetAccess(ctx, args);
    const options = await listSupportOptionsMap(ctx, args.organizationId);
    const settings = getWidgetChatSettings(options);
    const resolvedThreadId = await resolveWidgetThreadId(ctx, args);
    const [messages, helpdeskArticles] = await Promise.all([
      resolvedThreadId
        ? listWidgetMessagesForThread(ctx, {
            organizationId: args.organizationId,
            threadId: resolvedThreadId,
            limit: args.limit,
          })
        : Promise.resolve([]),
      listWidgetHelpdeskArticlesInternal(ctx, {
        organizationId: args.organizationId,
      }),
    ]);

    return {
      settings,
      threadId: resolvedThreadId ?? undefined,
      messages,
      helpdeskArticles: helpdeskArticles as Array<{
        id: string;
        title: string;
        summary: string;
        updatedAt: string;
        slug?: string;
      }>,
    };
  },
});
