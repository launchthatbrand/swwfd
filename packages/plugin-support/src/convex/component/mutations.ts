import { components } from "./_generated/api";
import { mutation } from "./_generated/server";
import {
  assertWidgetAccess,
  getWidgetChatSettings,
  listSupportOptionsMap,
  organizationMatches,
} from "./helpers";
import { v } from "convex/values";

// ------------------------------
// Support operational helpers
// ------------------------------

const resolveConversation = async (ctx: any, args: {
  organizationId: string;
  threadId?: string;
  sessionId?: string;
}) => {
  const resolved = args.threadId ?? args.sessionId;
  if (!resolved) {
    throw new Error("threadId is required");
  }
  const byThread = args.threadId
    ? await ctx.db
        .query("supportConversations")
        .withIndex("by_org_agentThreadId", (q: any) =>
          q.eq("organizationId", args.organizationId).eq("agentThreadId", resolved),
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
  const conversation = byThread ?? bySession;
  if (!conversation) {
    throw new Error("Conversation not found");
  }
  return { conversation, resolved };
};

const buildPresenceRoomId = (organizationId: string, threadOrSessionId: string) =>
  `support:${organizationId}:${threadOrSessionId.trim()}`;

const normalizeAgentPresenceUserId = (agentUserId: string) => {
  const normalized = agentUserId.trim();
  if (!normalized) {
    return "agent:unknown";
  }
  return normalized.startsWith("agent:") ? normalized : `agent:${normalized}`;
};

const buildWidgetThreadId = () =>
  `widget-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

type WidgetConversationRow = {
  _id: any;
  organizationId: string;
  sessionId: string;
  origin: "chat" | "email";
  status?: "open" | "snoozed" | "closed";
  mode?: "agent" | "manual";
  contactId?: string;
  contactName?: string;
  contactEmail?: string;
  agentThreadId?: string;
  firstMessageAt: number;
  lastMessageAt: number;
  totalMessages: number;
};

const resolveOrCreateWidgetConversation = async (
  ctx: any,
  args: {
    organizationId: string;
    threadId?: string;
    sessionId?: string;
    clientSessionId?: string;
    contactId?: string;
    contactName?: string;
    contactEmail?: string;
    mode?: "agent" | "manual";
  },
): Promise<{
  conversation: WidgetConversationRow;
  threadId: string;
  sessionId: string;
}> => {
  const explicitThreadId = args.threadId?.trim();
  const explicitSessionId = args.sessionId?.trim();
  const clientSessionId = args.clientSessionId?.trim();
  const sessionId =
    explicitSessionId ||
    clientSessionId ||
    explicitThreadId ||
    buildWidgetThreadId();

  const bySession = (await ctx.db
    .query("supportConversations")
    .withIndex("by_org_session", (q: any) =>
      q.eq("organizationId", args.organizationId).eq("sessionId", sessionId),
    )
    .unique()) as WidgetConversationRow | null;
  if (bySession) {
    const threadId = bySession.agentThreadId?.trim() || bySession.sessionId;
    return {
      conversation: bySession,
      threadId,
      sessionId: bySession.sessionId,
    };
  }

  const byThread =
    explicitThreadId &&
    ((await ctx.db
      .query("supportConversations")
      .withIndex("by_org_agentThreadId", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("agentThreadId", explicitThreadId),
      )
      .first()) as WidgetConversationRow | null);
  if (byThread) {
    return {
      conversation: byThread,
      threadId: byThread.agentThreadId?.trim() || byThread.sessionId,
      sessionId: byThread.sessionId,
    };
  }

  const now = Date.now();
  const threadId = explicitThreadId || sessionId;
  const conversation: Omit<WidgetConversationRow, "_id"> = {
    organizationId: args.organizationId,
    sessionId,
    origin: "chat",
    status: "open",
    mode: args.mode ?? "agent",
    contactId: args.contactId?.trim() || undefined,
    contactName: args.contactName?.trim() || undefined,
    contactEmail: args.contactEmail?.trim().toLowerCase() || undefined,
    agentThreadId: threadId,
    firstMessageAt: now,
    lastMessageAt: now,
    totalMessages: 0,
  };
  const insertedId = await ctx.db.insert("supportConversations", {
    ...conversation,
    createdAt: now,
    updatedAt: now,
  });

  return {
    conversation: {
      _id: insertedId,
      ...conversation,
    },
    threadId,
    sessionId,
  };
};

const appendWidgetMessage = async (
  ctx: any,
  args: {
    conversation: WidgetConversationRow;
    organizationId: string;
    threadId: string;
    role: "user" | "assistant";
    content: string;
    messageType?: "chat" | "email_inbound" | "email_outbound";
    agentName?: string;
  },
) => {
  const now = Date.now();
  const snippet = args.content.slice(0, 240);
  await ctx.db.patch(args.conversation._id, {
    agentThreadId: args.threadId,
    lastMessageSnippet: snippet,
    lastMessageAuthor: args.role,
    lastMessageAt: now,
    totalMessages: (args.conversation.totalMessages ?? 0) + 1,
    updatedAt: now,
  });
  await ctx.db.insert("supportConversationEvents", {
    organizationId: args.organizationId,
    sessionId: args.conversation.sessionId,
    agentThreadId: args.threadId,
    eventType: "message",
    payload: JSON.stringify({
      role: args.role,
      content: args.content,
      messageType: args.messageType ?? "chat",
      agentName: args.agentName,
    }),
    createdAt: now,
  });
};

const enforceRateLimit = async (
  ctx: any,
  args: { key: string; limit: number; windowMs: number },
) => {
  const now = Date.now();
  const windowStart = Math.floor(now / args.windowMs);
  const bucketKey = `${args.key}:${windowStart}`;

  const existing = await ctx.db
    .query("supportRateLimits")
    .withIndex("by_key", (q: any) => q.eq("key", bucketKey))
    .unique();

  if (!existing) {
    await ctx.db.insert("supportRateLimits", {
      key: bucketKey,
      count: 1,
      expiresAt: now + args.windowMs,
      updatedAt: now,
    });
    return;
  }

  if ((existing.count ?? 0) >= args.limit) {
    throw new Error("Rate limited");
  }

  await ctx.db.patch(existing._id, {
    count: (existing.count ?? 0) + 1,
    updatedAt: now,
  });
};

export const createSupportPost = mutation({
  args: {
    title: v.string(),
    organizationId: v.string(),
    postTypeSlug: v.string(),
    content: v.optional(v.string()),
    excerpt: v.optional(v.string()),
    slug: v.string(),
    status: v.union(
      v.literal("published"),
      v.literal("draft"),
      v.literal("archived"),
    ),
    tags: v.optional(v.array(v.string())),
    authorId: v.optional(v.string()),
    parentId: v.optional(v.id("posts")),
    parentTypeSlug: v.optional(v.string()),
    meta: v.optional(
      v.array(
        v.object({
          key: v.string(),
          value: v.optional(
            v.union(v.string(), v.number(), v.boolean(), v.null()),
          ),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();
    const postId = await ctx.db.insert("posts", {
      title: args.title,
      organizationId: args.organizationId,
      postTypeSlug: args.postTypeSlug.toLowerCase(),
      content: args.content,
      excerpt: args.excerpt,
      slug: args.slug.toLowerCase(),
      status: args.status,
      tags: args.tags,
      authorId: args.authorId,
      parentId: args.parentId,
      parentTypeSlug: args.parentTypeSlug,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    if (args.meta && args.meta.length > 0) {
      for (const entry of args.meta) {
        await ctx.db.insert("postsMeta", {
          postId,
          key: entry.key,
          value: entry.value ?? null,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }
    }

    return postId;
  },
});

export const updateSupportPost = mutation({
  args: {
    id: v.id("posts"),
    organizationId: v.string(),
    title: v.string(),
    postTypeSlug: v.string(),
    content: v.optional(v.string()),
    excerpt: v.optional(v.string()),
    slug: v.string(),
    status: v.union(
      v.literal("published"),
      v.literal("draft"),
      v.literal("archived"),
    ),
    tags: v.optional(v.array(v.string())),
    authorId: v.optional(v.string()),
    parentId: v.optional(v.id("posts")),
    parentTypeSlug: v.optional(v.string()),
    meta: v.optional(
      v.array(
        v.object({
          key: v.string(),
          value: v.optional(
            v.union(v.string(), v.number(), v.boolean(), v.null()),
          ),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return null;
    if (
      !organizationMatches(
        existing.organizationId ?? undefined,
        args.organizationId,
      )
    ) {
      return null;
    }

    const timestamp = Date.now();
    await ctx.db.patch(args.id, {
      title: args.title,
      postTypeSlug: args.postTypeSlug.toLowerCase(),
      content: args.content,
      excerpt: args.excerpt,
      slug: args.slug.toLowerCase(),
      status: args.status,
      tags: args.tags,
      authorId: args.authorId,
      parentId: args.parentId,
      parentTypeSlug: args.parentTypeSlug,
      updatedAt: timestamp,
    });

    if (args.meta) {
      for (const entry of args.meta) {
        const existingMeta = await ctx.db
          .query("postsMeta")
          .withIndex("by_post_and_key", (q) =>
            q.eq("postId", args.id).eq("key", entry.key),
          )
          .unique();
        if (existingMeta) {
          await ctx.db.patch(existingMeta._id, {
            value: entry.value ?? null,
            updatedAt: timestamp,
          });
        } else {
          await ctx.db.insert("postsMeta", {
            postId: args.id,
            key: entry.key,
            value: entry.value ?? null,
            createdAt: timestamp,
            updatedAt: timestamp,
          });
        }
      }
    }

    return args.id;
  },
});

export const upsertSupportPostMeta = mutation({
  args: {
    postId: v.id("posts"),
    organizationId: v.string(),
    entries: v.array(
      v.object({
        key: v.string(),
        value: v.optional(
          v.union(v.string(), v.number(), v.boolean(), v.null()),
        ),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) return false;
    if (
      !organizationMatches(
        post.organizationId ?? undefined,
        args.organizationId,
      )
    ) {
      return false;
    }
    const timestamp = Date.now();
    for (const entry of args.entries) {
      const existing = await ctx.db
        .query("postsMeta")
        .withIndex("by_post_and_key", (q) =>
          q.eq("postId", args.postId).eq("key", entry.key),
        )
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, {
          value: entry.value ?? null,
          updatedAt: timestamp,
        });
      } else {
        await ctx.db.insert("postsMeta", {
          postId: args.postId,
          key: entry.key,
          value: entry.value ?? null,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }
    }
    return true;
  },
});

export const upsertSupportOption = mutation({
  args: {
    organizationId: v.string(),
    key: v.string(),
    value: v.optional(
      v.union(v.string(), v.number(), v.boolean(), v.null()),
    ),
  },
  handler: async (ctx, args) => {
    const timestamp = Date.now();
    const existing = await ctx.db
      .query("options")
      .withIndex("by_org_key", (q) =>
        q.eq("organizationId", args.organizationId).eq("key", args.key),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value ?? null,
        updatedAt: timestamp,
      });
      return existing._id;
    }
    const id = await ctx.db.insert("options", {
      organizationId: args.organizationId,
      key: args.key,
      value: args.value ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    return id;
  },
});

const cannedChannelsValidator = v.array(
  v.union(v.literal("chat"), v.literal("email")),
);

const normalizeCannedChannels = (channels: ("chat" | "email")[]) => {
  const set = new Set<"chat" | "email">(channels);
  return Array.from(set);
};

export const createSupportCannedResponse = mutation({
  args: {
    organizationId: v.string(),
    title: v.string(),
    body: v.string(),
    channels: cannedChannelsValidator,
    isActive: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  returns: v.id("supportCannedResponses"),
  handler: async (ctx, args) => {
    const title = args.title.trim();
    const body = args.body.trim();
    const channels = normalizeCannedChannels(args.channels);
    if (!title) {
      throw new Error("Response title is required");
    }
    if (!body) {
      throw new Error("Response body is required");
    }
    if (!channels.length) {
      throw new Error("At least one channel is required");
    }
    const now = Date.now();
    return await ctx.db.insert("supportCannedResponses", {
      organizationId: args.organizationId,
      title,
      body,
      channels,
      isActive: args.isActive ?? true,
      sortOrder: args.sortOrder,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateSupportCannedResponse = mutation({
  args: {
    id: v.id("supportCannedResponses"),
    organizationId: v.string(),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    channels: v.optional(cannedChannelsValidator),
    isActive: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Canned response not found");
    }
    if (
      !organizationMatches(
        existing.organizationId ?? undefined,
        args.organizationId ?? undefined,
      )
    ) {
      throw new Error("Canned response does not belong to this organization");
    }

    const title =
      typeof args.title === "string" ? args.title.trim() : existing.title;
    const body = typeof args.body === "string" ? args.body.trim() : existing.body;
    const channels = args.channels
      ? normalizeCannedChannels(args.channels)
      : existing.channels;
    if (!title) {
      throw new Error("Response title is required");
    }
    if (!body) {
      throw new Error("Response body is required");
    }
    if (!channels.length) {
      throw new Error("At least one channel is required");
    }

    await ctx.db.patch(args.id, {
      title,
      body,
      channels,
      isActive: args.isActive ?? existing.isActive,
      sortOrder: args.sortOrder ?? existing.sortOrder,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const setSupportCannedResponseActive = mutation({
  args: {
    id: v.id("supportCannedResponses"),
    organizationId: v.string(),
    isActive: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Canned response not found");
    }
    if (
      !organizationMatches(
        existing.organizationId ?? undefined,
        args.organizationId ?? undefined,
      )
    ) {
      throw new Error("Canned response does not belong to this organization");
    }
    await ctx.db.patch(args.id, {
      isActive: args.isActive,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const deleteSupportCannedResponse = mutation({
  args: {
    id: v.id("supportCannedResponses"),
    organizationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      return null;
    }
    if (
      !organizationMatches(
        existing.organizationId ?? undefined,
        args.organizationId ?? undefined,
      )
    ) {
      throw new Error("Canned response does not belong to this organization");
    }
    await ctx.db.delete(args.id);
    return null;
  },
});

// ------------------------------
// Support operational mutations
// ------------------------------

export const rateLimitOrThrow = mutation({
  args: {
    key: v.string(),
    limit: v.number(),
    windowMs: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await enforceRateLimit(ctx, args);
    return null;
  },
});

export const widgetCreateThread = mutation({
  args: {
    organizationId: v.string(),
    widgetKey: v.string(),
    requestOrigin: v.optional(v.string()),
    requestHost: v.optional(v.string()),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    clientSessionId: v.optional(v.string()),
    contactId: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    mode: v.optional(v.union(v.literal("agent"), v.literal("manual"))),
  },
  returns: v.object({
    threadId: v.string(),
    sessionId: v.string(),
  }),
  handler: async (ctx, args) => {
    await assertWidgetAccess(ctx, args);
    const throttleKey =
      args.clientSessionId?.trim() ||
      args.sessionId?.trim() ||
      args.threadId?.trim() ||
      "anon";
    await enforceRateLimit(ctx, {
      key: `support:widget:create-thread:${args.organizationId}:${throttleKey}`,
      limit: 10,
      windowMs: 60_000,
    });

    const resolved = await resolveOrCreateWidgetConversation(ctx, args);
    return {
      threadId: resolved.threadId,
      sessionId: resolved.sessionId,
    };
  },
});

export const widgetCaptureContact = mutation({
  args: {
    organizationId: v.string(),
    widgetKey: v.string(),
    requestOrigin: v.optional(v.string()),
    requestHost: v.optional(v.string()),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    clientSessionId: v.optional(v.string()),
    contactId: v.optional(v.string()),
    fullName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
  },
  returns: v.object({
    threadId: v.string(),
    sessionId: v.string(),
    contactId: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    await assertWidgetAccess(ctx, args);
    const throttleKey =
      args.clientSessionId?.trim() ||
      args.sessionId?.trim() ||
      args.threadId?.trim() ||
      "anon";
    await enforceRateLimit(ctx, {
      key: `support:widget:capture-contact:${args.organizationId}:${throttleKey}`,
      limit: 20,
      windowMs: 60_000,
    });

    const resolved = await resolveOrCreateWidgetConversation(ctx, {
      organizationId: args.organizationId,
      threadId: args.threadId,
      sessionId: args.sessionId,
      clientSessionId: args.clientSessionId,
      contactId: args.contactId,
      contactName: args.fullName,
      contactEmail: args.email,
    });
    const resolvedContactId =
      args.contactId?.trim() ||
      resolved.conversation.contactId ||
      `contact:${resolved.sessionId}`;
    const resolvedContactName =
      args.fullName?.trim() || resolved.conversation.contactName;
    const resolvedContactEmail =
      args.email?.trim().toLowerCase() || resolved.conversation.contactEmail;

    await ctx.db.patch(resolved.conversation._id, {
      contactId: resolvedContactId,
      contactName: resolvedContactName,
      contactEmail: resolvedContactEmail,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("supportConversationEvents", {
      organizationId: args.organizationId,
      sessionId: resolved.sessionId,
      agentThreadId: resolved.threadId,
      eventType: "contact_updated",
      payload: JSON.stringify({
        contactId: resolvedContactId,
        contactName: resolvedContactName,
        contactEmail: resolvedContactEmail,
        phone: args.phone?.trim() || undefined,
        company: args.company?.trim() || undefined,
      }),
      createdAt: Date.now(),
    });

    return {
      threadId: resolved.threadId,
      sessionId: resolved.sessionId,
      contactId: resolvedContactId,
      contactName: resolvedContactName,
      contactEmail: resolvedContactEmail,
    };
  },
});

export const widgetSendMessage = mutation({
  args: {
    organizationId: v.string(),
    widgetKey: v.string(),
    requestOrigin: v.optional(v.string()),
    requestHost: v.optional(v.string()),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    clientSessionId: v.optional(v.string()),
    prompt: v.string(),
    role: v.optional(v.union(v.literal("user"), v.literal("assistant"))),
    contactId: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    agentName: v.optional(v.string()),
  },
  returns: v.object({
    threadId: v.string(),
    sessionId: v.string(),
    mode: v.union(v.literal("agent"), v.literal("manual")),
    autoRespondEnabled: v.boolean(),
    requiresAgentReply: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const content = args.prompt.trim();
    if (!content) {
      throw new Error("prompt is required");
    }
    await assertWidgetAccess(ctx, args);

    const throttleKey =
      args.clientSessionId?.trim() ||
      args.sessionId?.trim() ||
      args.threadId?.trim() ||
      "anon";
    await enforceRateLimit(ctx, {
      key: `support:widget:message:${args.organizationId}:${throttleKey}`,
      limit: 30,
      windowMs: 60_000,
    });

    const options = await listSupportOptionsMap(ctx, args.organizationId);
    const settings = getWidgetChatSettings(options);
    const resolved = await resolveOrCreateWidgetConversation(ctx, {
      organizationId: args.organizationId,
      threadId: args.threadId,
      sessionId: args.sessionId,
      clientSessionId: args.clientSessionId,
      contactId: args.contactId,
      contactName: args.contactName,
      contactEmail: args.contactEmail,
    });
    const role = args.role ?? "user";
    const mode = resolved.conversation.mode ?? "agent";
    await appendWidgetMessage(ctx, {
      conversation: resolved.conversation,
      organizationId: args.organizationId,
      threadId: resolved.threadId,
      role,
      content,
      messageType: "chat",
      agentName: args.agentName,
    });

    return {
      threadId: resolved.threadId,
      sessionId: resolved.sessionId,
      mode,
      autoRespondEnabled: settings.autoRespondToThreads,
      requiresAgentReply:
        role === "user" && mode === "agent" && settings.autoRespondToThreads,
    };
  },
});

export const widgetPresenceHeartbeat = mutation({
  args: {
    organizationId: v.string(),
    widgetKey: v.string(),
    requestOrigin: v.optional(v.string()),
    requestHost: v.optional(v.string()),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    userId: v.string(),
    sessionTokenId: v.string(),
    interval: v.optional(v.number()),
    data: v.optional(v.any()),
  },
  returns: v.object({
    roomToken: v.string(),
    sessionToken: v.string(),
  }),
  handler: async (ctx, args) => {
    await assertWidgetAccess(ctx, args);
    const resolvedThreadId = args.threadId?.trim() || args.sessionId?.trim();
    if (!resolvedThreadId) {
      throw new Error("threadId or sessionId is required");
    }
    const roomId = buildPresenceRoomId(args.organizationId, resolvedThreadId);
    const heartbeat = await ctx.runMutation(components.presence.public.heartbeat, {
      roomId,
      userId: args.userId,
      sessionId: args.sessionTokenId,
      interval: args.interval,
    });
    if (args.data !== undefined) {
      await ctx.runMutation(components.presence.public.updateRoomUser, {
        roomId,
        userId: args.userId,
        data: args.data,
      });
    }
    return heartbeat;
  },
});

export const widgetPresenceDisconnect = mutation({
  args: {
    organizationId: v.string(),
    widgetKey: v.string(),
    requestOrigin: v.optional(v.string()),
    requestHost: v.optional(v.string()),
    sessionToken: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertWidgetAccess(ctx, args);
    await ctx.runMutation(components.presence.public.disconnect, {
      sessionToken: args.sessionToken,
    });
    return null;
  },
});

export const upsertConversationIndex = mutation({
  args: {
    organizationId: v.string(),
    sessionId: v.string(),
    agentThreadId: v.optional(v.string()),
    origin: v.union(v.literal("chat"), v.literal("email")),
    status: v.optional(
      v.union(v.literal("open"), v.literal("snoozed"), v.literal("closed")),
    ),
    mode: v.optional(v.union(v.literal("agent"), v.literal("manual"))),
    subject: v.optional(v.string()),
    emailThreadId: v.optional(v.string()),
    inboundAlias: v.optional(v.string()),
    contactId: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    assignedAgentId: v.optional(v.string()),
    assignedAgentName: v.optional(v.string()),
    firstMessageAt: v.optional(v.number()),
    lastMessageAt: v.optional(v.number()),
    lastMessageAuthor: v.optional(
      v.union(v.literal("user"), v.literal("assistant")),
    ),
    lastMessageSnippet: v.optional(v.string()),
    totalMessages: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("supportConversations")
      .withIndex("by_org_session", (q) =>
        q.eq("organizationId", args.organizationId).eq("sessionId", args.sessionId),
      )
      .unique();

    const firstMessageAt = args.firstMessageAt ?? existing?.firstMessageAt ?? now;
    const lastMessageAt = args.lastMessageAt ?? existing?.lastMessageAt ?? now;
    const totalMessages = args.totalMessages ?? existing?.totalMessages ?? 0;

    const payload = {
      organizationId: args.organizationId,
      sessionId: args.sessionId,
      origin: args.origin,
      status: args.status ?? existing?.status ?? "open",
      mode: args.mode ?? existing?.mode ?? "agent",
      subject: args.subject ?? existing?.subject,
      emailThreadId: args.emailThreadId ?? existing?.emailThreadId,
      inboundAlias: args.inboundAlias ?? existing?.inboundAlias,
      contactId: args.contactId ?? existing?.contactId,
      contactName: args.contactName ?? existing?.contactName,
      contactEmail: args.contactEmail ?? existing?.contactEmail,
      assignedAgentId: args.assignedAgentId ?? existing?.assignedAgentId,
      assignedAgentName: args.assignedAgentName ?? existing?.assignedAgentName,
      agentThreadId: args.agentThreadId ?? existing?.agentThreadId,
      lastMessageSnippet: args.lastMessageSnippet ?? existing?.lastMessageSnippet,
      lastMessageAuthor: args.lastMessageAuthor ?? existing?.lastMessageAuthor,
      firstMessageAt,
      lastMessageAt,
      totalMessages,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return null;
    }

    await ctx.db.insert("supportConversations", payload);
    return null;
  },
});

export const recordMessageIndexUpdate = mutation({
  args: {
    organizationId: v.string(),
    // Stable browser session id if available, else thread id.
    sessionId: v.string(),
    threadId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    snippet: v.string(),
    contactId: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactName: v.optional(v.string()),
    mode: v.optional(v.union(v.literal("agent"), v.literal("manual"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("supportConversations")
      .withIndex("by_org_session", (q) =>
        q.eq("organizationId", args.organizationId).eq("sessionId", args.sessionId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        contactId: args.contactId ?? existing.contactId,
        contactEmail: args.contactEmail ?? existing.contactEmail,
        contactName: args.contactName ?? existing.contactName,
        agentThreadId: args.threadId,
        lastMessageSnippet: args.snippet,
        lastMessageAuthor: args.role,
        lastMessageAt: now,
        totalMessages: (existing.totalMessages ?? 0) + 1,
        updatedAt: now,
      });
      return null;
    }

    await ctx.db.insert("supportConversations", {
      organizationId: args.organizationId,
      sessionId: args.sessionId,
      origin: "chat",
      status: "open",
      mode: args.mode ?? "agent",
      contactId: args.contactId,
      contactEmail: args.contactEmail,
      contactName: args.contactName,
      agentThreadId: args.threadId,
      lastMessageSnippet: args.snippet,
      lastMessageAuthor: args.role,
      firstMessageAt: now,
      lastMessageAt: now,
      totalMessages: 1,
      createdAt: now,
      updatedAt: now,
    });
    return null;
  },
});

export const appendConversationEvent = mutation({
  args: {
    organizationId: v.string(),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    eventType: v.string(),
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),
    payload: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { conversation, resolved } = await resolveConversation(ctx, args);
    const now = Date.now();
    await ctx.db.insert("supportConversationEvents", {
      organizationId: args.organizationId,
      sessionId: conversation.sessionId,
      agentThreadId: conversation.agentThreadId ?? resolved,
      eventType: args.eventType,
      actorId: args.actorId,
      actorName: args.actorName,
      payload: args.payload === undefined ? undefined : JSON.stringify(args.payload),
      createdAt: now,
    });
    return null;
  },
});

export const addConversationNote = mutation({
  args: {
    organizationId: v.string(),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    note: v.string(),
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { conversation, resolved } = await resolveConversation(ctx, args);
    const now = Date.now();
    await ctx.db.insert("supportConversationNotes", {
      organizationId: args.organizationId,
      sessionId: conversation.sessionId,
      agentThreadId: conversation.agentThreadId ?? resolved,
      note: args.note,
      actorId: args.actorId,
      actorName: args.actorName,
      createdAt: now,
    });
    await ctx.db.insert("supportConversationEvents", {
      organizationId: args.organizationId,
      sessionId: conversation.sessionId,
      agentThreadId: conversation.agentThreadId ?? resolved,
      eventType: "note_added",
      actorId: args.actorId,
      actorName: args.actorName,
      createdAt: now,
    });
    return null;
  },
});

export const setConversationStatus = mutation({
  args: {
    organizationId: v.string(),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    status: v.union(v.literal("open"), v.literal("snoozed"), v.literal("closed")),
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { conversation, resolved } = await resolveConversation(ctx, args);
    const current = (conversation.status ?? "open") as "open" | "snoozed" | "closed";
    const next = args.status;

    const allowed: Record<
      "open" | "snoozed" | "closed",
      readonly ("open" | "snoozed" | "closed")[]
    > = {
      open: ["snoozed", "closed"],
      snoozed: ["open", "closed"],
      closed: ["open"],
    };
    if (next !== current && !allowed[current].includes(next)) {
      throw new Error(`Invalid status transition: ${current} -> ${next}`);
    }

    if (next !== current) {
      await ctx.db.patch(conversation._id, {
        status: next,
        updatedAt: Date.now(),
      });
      await ctx.db.insert("supportConversationEvents", {
        organizationId: args.organizationId,
        sessionId: conversation.sessionId,
        agentThreadId: conversation.agentThreadId ?? resolved,
        eventType: "status_changed",
        actorId: args.actorId,
        actorName: args.actorName,
        payload: JSON.stringify({ from: current, to: next }),
        createdAt: Date.now(),
      });
    }

    return null;
  },
});

export const assignConversation = mutation({
  args: {
    organizationId: v.string(),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    assignedAgentId: v.string(),
    assignedAgentName: v.optional(v.string()),
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { conversation, resolved } = await resolveConversation(ctx, args);
    await ctx.db.patch(conversation._id, {
      assignedAgentId: args.assignedAgentId,
      assignedAgentName: args.assignedAgentName,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("supportConversationEvents", {
      organizationId: args.organizationId,
      sessionId: conversation.sessionId,
      agentThreadId: conversation.agentThreadId ?? resolved,
      eventType: "assignment_changed",
      actorId: args.actorId,
      actorName: args.actorName,
      payload: JSON.stringify({
        assignedAgentId: args.assignedAgentId,
        assignedAgentName: args.assignedAgentName,
      }),
      createdAt: Date.now(),
    });
    return null;
  },
});

export const unassignConversation = mutation({
  args: {
    organizationId: v.string(),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { conversation, resolved } = await resolveConversation(ctx, args);
    await ctx.db.patch(conversation._id, {
      assignedAgentId: undefined,
      assignedAgentName: undefined,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("supportConversationEvents", {
      organizationId: args.organizationId,
      sessionId: conversation.sessionId,
      agentThreadId: conversation.agentThreadId ?? resolved,
      eventType: "assignment_cleared",
      actorId: args.actorId,
      actorName: args.actorName,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const setConversationMode = mutation({
  args: {
    organizationId: v.string(),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    mode: v.union(v.literal("agent"), v.literal("manual")),
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { conversation, resolved } = await resolveConversation(ctx, args);
    const previousMode = conversation.mode ?? "agent";
    if (previousMode !== args.mode) {
      await ctx.db.patch(conversation._id, {
        mode: args.mode,
        updatedAt: Date.now(),
      });
      await ctx.db.insert("supportConversationEvents", {
        organizationId: args.organizationId,
        sessionId: conversation.sessionId,
        agentThreadId: conversation.agentThreadId ?? resolved,
        eventType: "mode_changed",
        actorId: args.actorId,
        actorName: args.actorName,
        payload: JSON.stringify({ from: previousMode, to: args.mode }),
        createdAt: Date.now(),
      });
    }
    return null;
  },
});

export const deleteConversation = mutation({
  args: {
    organizationId: v.string(),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { conversation } = await resolveConversation(ctx, args);

    const notes = await ctx.db
      .query("supportConversationNotes")
      .withIndex("by_org_session", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("sessionId", conversation.sessionId),
      )
      .collect();
    for (const note of notes) {
      await ctx.db.delete(note._id);
    }

    const events = await ctx.db
      .query("supportConversationEvents")
      .withIndex("by_org_session", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("sessionId", conversation.sessionId),
      )
      .collect();
    for (const event of events) {
      await ctx.db.delete(event._id);
    }

    await ctx.db.delete(conversation._id);
    return null;
  },
});

export const supportPresenceHeartbeat = mutation({
  args: {
    roomId: v.string(),
    userId: v.string(),
    sessionId: v.string(),
    interval: v.optional(v.number()),
  },
  returns: v.object({
    roomToken: v.string(),
    sessionToken: v.string(),
  }),
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.presence.public.heartbeat, {
      roomId: args.roomId,
      userId: args.userId,
      sessionId: args.sessionId,
      interval: args.interval,
    });
  },
});

export const supportPresenceDisconnect = mutation({
  args: {
    sessionToken: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(components.presence.public.disconnect, {
      sessionToken: args.sessionToken,
    });
    return null;
  },
});

export const supportPresenceUpdateRoomUser = mutation({
  args: {
    roomId: v.string(),
    userId: v.string(),
    data: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(components.presence.public.updateRoomUser, {
      roomId: args.roomId,
      userId: args.userId,
      data: args.data,
    });
    return null;
  },
});

export const setAgentPresence = mutation({
  args: {
    organizationId: v.string(),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    agentUserId: v.string(),
    agentName: v.optional(v.string()),
    status: v.union(v.literal("typing"), v.literal("idle")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const resolved = args.threadId ?? args.sessionId;
    if (!resolved) return null;

    const now = Date.now();
    const roomId = buildPresenceRoomId(args.organizationId, resolved);
    const normalizedAgentUserId = normalizeAgentPresenceUserId(args.agentUserId);
    const typingMarkerUserId = `typing:${normalizedAgentUserId}`;
    const typingMarkerSessionId = `typing:${roomId}:${normalizedAgentUserId}`;

    await ctx.runMutation(components.presence.public.updateRoomUser, {
      roomId,
      userId: normalizedAgentUserId,
      data: {
        role: "agent",
        name: args.agentName ?? undefined,
        typing: args.status === "typing",
        updatedAt: now,
      },
    });

    if (args.status === "typing") {
      await ctx.runMutation(components.presence.public.heartbeat, {
        roomId,
        userId: typingMarkerUserId,
        sessionId: typingMarkerSessionId,
        interval: 10_000,
      });
      await ctx.runMutation(components.presence.public.updateRoomUser, {
        roomId,
        userId: typingMarkerUserId,
        data: {
          role: "agent_typing",
          agentUserId: normalizedAgentUserId,
          agentName: args.agentName ?? undefined,
          status: "typing",
          updatedAt: now,
        },
      });
      return null;
    }

    await ctx.runMutation(components.presence.public.removeRoomUser, {
      roomId,
      userId: typingMarkerUserId,
    });
    return null;
  },
});

export const saveRagSourceConfig = mutation({
  args: {
    organizationId: v.string(),
    sourceId: v.optional(v.id("supportRagSources")),
    postTypeSlug: v.string(),
    sourceType: v.optional(
      v.union(v.literal("postType"), v.literal("lmsPostType")),
    ),
    fields: v.optional(v.array(v.string())),
    includeTags: v.optional(v.boolean()),
    metaFieldKeys: v.optional(v.array(v.string())),
    additionalMetaKeys: v.optional(v.string()),
    displayName: v.optional(v.string()),
    isEnabled: v.optional(v.boolean()),
    useCustomBaseInstructions: v.optional(v.boolean()),
    baseInstructions: v.optional(v.string()),
  },
  returns: v.object({ ragSourceId: v.id("supportRagSources") }),
  handler: async (ctx, args) => {
    const timestamp = Date.now();
    const slug = args.postTypeSlug.toLowerCase();
    const inferredSourceType =
      args.sourceType ??
      ([
        "courses",
        "lessons",
        "topics",
        "quizzes",
        "certificates",
        "badges",
      ].includes(slug)
        ? "lmsPostType"
        : "postType");
    const fields = (args.fields ?? ["title", "content"]).filter(
      (field): field is "title" | "excerpt" | "content" =>
        field === "title" || field === "excerpt" || field === "content",
    );

    if (args.sourceId) {
      await ctx.db.patch(args.sourceId, {
        postTypeSlug: slug,
        sourceType: inferredSourceType,
        fields,
        includeTags: args.includeTags ?? false,
        metaFieldKeys: args.metaFieldKeys ?? [],
        additionalMetaKeys: args.additionalMetaKeys ?? "",
        displayName: args.displayName ?? slug,
        isEnabled: args.isEnabled ?? true,
        useCustomBaseInstructions: args.useCustomBaseInstructions ?? false,
        baseInstructions: args.baseInstructions ?? "",
        updatedAt: timestamp,
      });
      return { ragSourceId: args.sourceId };
    }

    const existing = await ctx.db
      .query("supportRagSources")
      .withIndex("by_org_type_and_postTypeSlug", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("sourceType", inferredSourceType)
          .eq("postTypeSlug", slug),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        fields,
        includeTags: args.includeTags ?? false,
        metaFieldKeys: args.metaFieldKeys ?? [],
        additionalMetaKeys: args.additionalMetaKeys ?? "",
        displayName: args.displayName ?? slug,
        isEnabled: args.isEnabled ?? true,
        useCustomBaseInstructions: args.useCustomBaseInstructions ?? false,
        baseInstructions: args.baseInstructions ?? "",
        updatedAt: timestamp,
      });
      return { ragSourceId: existing._id };
    }

    const id = await ctx.db.insert("supportRagSources", {
      organizationId: args.organizationId,
      sourceType: inferredSourceType,
      postTypeSlug: slug,
      fields,
      includeTags: args.includeTags ?? false,
      metaFieldKeys: args.metaFieldKeys ?? [],
      additionalMetaKeys: args.additionalMetaKeys ?? "",
      displayName: args.displayName ?? slug,
      isEnabled: args.isEnabled ?? true,
      useCustomBaseInstructions: args.useCustomBaseInstructions ?? false,
      baseInstructions: args.baseInstructions ?? "",
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return { ragSourceId: id };
  },
});

export const deleteRagSourceConfig = mutation({
  args: {
    organizationId: v.string(),
    sourceId: v.id("supportRagSources"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.sourceId);
    if (!doc || doc.organizationId !== args.organizationId) {
      return null;
    }
    await ctx.db.delete(args.sourceId);
    return null;
  },
});

export const touchRagSourceIndexedAt = mutation({
  args: { sourceId: v.id("supportRagSources") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sourceId, {
      lastIndexedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const upsertRagIndexStatus = mutation({
  args: {
    organizationId: v.string(),
    sourceType: v.union(v.literal("postType"), v.literal("lmsPostType")),
    postTypeSlug: v.string(),
    postId: v.string(),
    entryKey: v.string(),
    lastStatus: v.string(),
    lastAttemptAt: v.number(),
    lastSuccessAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
    lastEntryId: v.optional(v.string()),
    lastEntryStatus: v.optional(
      v.union(v.literal("pending"), v.literal("ready"), v.literal("replaced")),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalizedPostTypeSlug = args.postTypeSlug.toLowerCase();
    const existing = await ctx.db
      .query("supportRagIndexStatus")
      .withIndex("by_org_post", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("postTypeSlug", normalizedPostTypeSlug)
          .eq("postId", args.postId),
      )
      .unique();

    const payload = {
      organizationId: args.organizationId,
      sourceType: args.sourceType,
      postTypeSlug: normalizedPostTypeSlug,
      postId: args.postId,
      entryKey: args.entryKey,
      lastStatus: args.lastStatus,
      lastAttemptAt: args.lastAttemptAt,
      lastSuccessAt: args.lastSuccessAt,
      lastError: args.lastError,
      lastEntryId: args.lastEntryId,
      lastEntryStatus: args.lastEntryStatus,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return null;
    }

    await ctx.db.insert("supportRagIndexStatus", payload);
    return null;
  },
});

export const removeRagIndexStatus = mutation({
  args: {
    organizationId: v.string(),
    postTypeSlug: v.string(),
    postId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalizedPostTypeSlug = args.postTypeSlug.toLowerCase();
    const existing = await ctx.db
      .query("supportRagIndexStatus")
      .withIndex("by_org_post", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("postTypeSlug", normalizedPostTypeSlug)
          .eq("postId", args.postId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});

export const mutations = {
  createSupportPost,
  updateSupportPost,
  upsertSupportPostMeta,
  upsertSupportOption,
  createSupportCannedResponse,
  updateSupportCannedResponse,
  setSupportCannedResponseActive,
  deleteSupportCannedResponse,
  rateLimitOrThrow,
  widgetCreateThread,
  widgetCaptureContact,
  widgetSendMessage,
  widgetPresenceHeartbeat,
  widgetPresenceDisconnect,
  upsertConversationIndex,
  recordMessageIndexUpdate,
  appendConversationEvent,
  addConversationNote,
  setConversationStatus,
  assignConversation,
  unassignConversation,
  setConversationMode,
  deleteConversation,
  supportPresenceHeartbeat,
  supportPresenceDisconnect,
  supportPresenceUpdateRoomUser,
  setAgentPresence,
  saveRagSourceConfig,
  deleteRagSourceConfig,
  touchRagSourceIndexedAt,
  upsertRagIndexStatus,
  removeRagIndexStatus,
};


