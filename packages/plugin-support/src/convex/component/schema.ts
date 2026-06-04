import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const postsTable = defineTable({
  title: v.string(),
  content: v.optional(v.string()),
  excerpt: v.optional(v.string()),
  slug: v.string(),
  status: v.union(
    v.literal("published"),
    v.literal("draft"),
    v.literal("archived"),
  ),
  category: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  featuredImageUrl: v.optional(v.string()),
  postTypeSlug: v.string(),
  organizationId: v.string(),
  authorId: v.optional(v.string()),
  parentId: v.optional(v.id("posts")),
  parentTypeSlug: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
})
  .index("by_slug", ["slug"])
  .index("by_status", ["status"])
  .index("by_postTypeSlug", ["postTypeSlug"])
  .index("by_org", ["organizationId"])
  .index("by_org_slug", ["organizationId", "slug"])
  .index("by_org_postTypeSlug", ["organizationId", "postTypeSlug"])
  .index("by_parent", ["parentId"])
  .index("by_org_parent", ["organizationId", "parentId"]);

const postsMetaTable = defineTable({
  postId: v.id("posts"),
  key: v.string(),
  value: v.optional(v.union(v.string(), v.number(), v.boolean(), v.null())),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
})
  .index("by_post", ["postId"])
  .index("by_post_and_key", ["postId", "key"]);

const optionsTable = defineTable({
  organizationId: v.string(),
  key: v.string(),
  value: v.optional(v.union(v.string(), v.number(), v.boolean(), v.null())),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
})
  .index("by_org_key", ["organizationId", "key"])
  .index("by_key", ["key"]);

// ------------------------------
// Support operational tables
// ------------------------------

const supportConversationsTable = defineTable({
  organizationId: v.string(),
  // Stable browser session id when provided, otherwise fallback to thread id.
  sessionId: v.string(),
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
  // Canonical agent thread id in components.agent
  agentThreadId: v.optional(v.string()),
  lastMessageSnippet: v.optional(v.string()),
  lastMessageAuthor: v.optional(
    v.union(v.literal("user"), v.literal("assistant")),
  ),
  firstMessageAt: v.number(),
  lastMessageAt: v.number(),
  totalMessages: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_org", ["organizationId"])
  .index("by_org_session", ["organizationId", "sessionId"])
  .index("by_org_agentThreadId", ["organizationId", "agentThreadId"])
  .index("by_org_lastMessageAt", ["organizationId", "lastMessageAt"]);

const supportConversationNotesTable = defineTable({
  organizationId: v.string(),
  sessionId: v.string(),
  agentThreadId: v.optional(v.string()),
  note: v.string(),
  actorId: v.optional(v.string()),
  actorName: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_org_session", ["organizationId", "sessionId"])
  .index("by_org_session_createdAt", [
    "organizationId",
    "sessionId",
    "createdAt",
  ]);

const supportConversationEventsTable = defineTable({
  organizationId: v.string(),
  sessionId: v.string(),
  agentThreadId: v.optional(v.string()),
  eventType: v.string(),
  actorId: v.optional(v.string()),
  actorName: v.optional(v.string()),
  payload: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_org_session", ["organizationId", "sessionId"])
  .index("by_org_session_createdAt", [
    "organizationId",
    "sessionId",
    "createdAt",
  ]);

const supportRateLimitsTable = defineTable({
  key: v.string(),
  count: v.number(),
  expiresAt: v.number(),
  updatedAt: v.number(),
}).index("by_key", ["key"]);

const supportCannedResponsesTable = defineTable({
  organizationId: v.string(),
  title: v.string(),
  body: v.string(),
  channels: v.array(v.union(v.literal("chat"), v.literal("email"))),
  isActive: v.boolean(),
  sortOrder: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_org", ["organizationId"])
  .index("by_org_active", ["organizationId", "isActive"])
  .index("by_org_active_updatedAt", ["organizationId", "isActive", "updatedAt"]);

const ragFieldSelection = v.union(
  v.literal("title"),
  v.literal("excerpt"),
  v.literal("content"),
);

const supportRagSourcesTable = defineTable({
  organizationId: v.string(),
  sourceType: v.union(v.literal("postType"), v.literal("lmsPostType")),
  postTypeSlug: v.string(),
  fields: v.array(ragFieldSelection),
  includeTags: v.boolean(),
  metaFieldKeys: v.optional(v.array(v.string())),
  additionalMetaKeys: v.optional(v.string()),
  displayName: v.optional(v.string()),
  isEnabled: v.boolean(),
  useCustomBaseInstructions: v.optional(v.boolean()),
  baseInstructions: v.optional(v.string()),
  lastIndexedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_org_type", ["organizationId", "sourceType"])
  .index("by_org_postTypeSlug", ["organizationId", "postTypeSlug"])
  .index("by_org_type_and_postTypeSlug", [
    "organizationId",
    "sourceType",
    "postTypeSlug",
  ]);

const supportRagIndexStatusTable = defineTable({
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
})
  .index("by_org_post", ["organizationId", "postTypeSlug", "postId"])
  .index("by_org_sourceType_postType", [
    "organizationId",
    "sourceType",
    "postTypeSlug",
  ])
  .index("by_org_entryKey", ["organizationId", "entryKey"]);

export default defineSchema({
  posts: postsTable,
  postsMeta: postsMetaTable,
  options: optionsTable,
  supportConversations: supportConversationsTable,
  supportConversationNotes: supportConversationNotesTable,
  supportConversationEvents: supportConversationEventsTable,
  supportRateLimits: supportRateLimitsTable,
  supportCannedResponses: supportCannedResponsesTable,
  supportRagSources: supportRagSourcesTable,
  supportRagIndexStatus: supportRagIndexStatusTable,
});
