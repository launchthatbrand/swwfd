import { defineSchema, defineTable } from "convex/server";

import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const mondayAdvancedFilterFieldValidator = v.union(
  v.literal("owner"),
  v.literal("district"),
  v.literal("name"),
  v.literal("email"),
  v.literal("phone"),
  v.literal("address"),
  v.literal("tags"),
  v.literal("createdAt"),
  v.literal("hireDate"),
  v.literal("detail"),
);

const mondayAdvancedFilterOperatorValidator = v.union(
  v.literal("contains"),
  v.literal("equals"),
  v.literal("not_equals"),
  v.literal("starts_with"),
  v.literal("ends_with"),
  v.literal("is_empty"),
  v.literal("is_not_empty"),
  v.literal("on_or_after"),
  v.literal("on_or_before"),
  v.literal("between"),
);

const mondayAdvancedFilterConditionValidator = v.object({
  id: v.string(),
  field: mondayAdvancedFilterFieldValidator,
  operator: mondayAdvancedFilterOperatorValidator,
  value: v.string(),
  valueTo: v.string(),
  target: v.optional(v.string()),
});

export default defineSchema({
  ...authTables,

  // Customize the Convex Auth `users` table to store a name from password sign-up.
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    isAdmin: v.optional(v.boolean()),
  })
    .index("email", ["email"])
    .index("by_isAdmin", ["isAdmin"]),

  jobs: defineTable({
    title: v.string(),
    company: v.string(),
    location: v.string(),
    description: v.string(),
    tags: v.array(v.string()),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),

  jobApplications: defineTable({
    jobId: v.id("jobs"),
    userId: v.id("users"),
    coverLetter: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_jobId", ["jobId"])
    .index("by_userId", ["userId"])
    .index("by_jobId_and_userId", ["jobId", "userId"]),

  mondayTouchBackfillJobs: defineTable({
    status: v.union(
      v.literal("running"),
      v.literal("done"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    workflowId: v.optional(v.string()),
    sourceTag: v.string(),
    baselineDate: v.string(),
    contactBoardId: v.string(),
    touchBoardId: v.string(),
    pageSize: v.number(),
    currentCursor: v.optional(v.union(v.string(), v.null())),
    processedContacts: v.number(),
    createdTouches: v.number(),
    skippedTouches: v.number(),
    errorsCount: v.number(),
    startedAt: v.number(),
    updatedAt: v.number(),
    finishedAt: v.optional(v.union(v.number(), v.null())),
    lastError: v.optional(v.union(v.string(), v.null())),
  })
    .index("by_startedAt", ["startedAt"])
    .index("by_status", ["status"]),

  mondayTouchRangeBackfillJobs: defineTable({
    status: v.union(
      v.literal("running"),
      v.literal("done"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    workflowId: v.optional(v.string()),
    dateFrom: v.string(),
    dateTo: v.string(),
    dryRun: v.boolean(),
    contactBoardId: v.string(),
    touchBoardId: v.string(),
    pageSize: v.number(),
    currentCursor: v.optional(v.union(v.string(), v.null())),
    processedContacts: v.number(),
    inRangeContacts: v.number(),
    createdTouches: v.number(),
    updatedTouches: v.number(),
    skippedTouches: v.number(),
    errorsCount: v.number(),
    startedAt: v.number(),
    updatedAt: v.number(),
    finishedAt: v.optional(v.union(v.number(), v.null())),
    lastError: v.optional(v.union(v.string(), v.null())),
  })
    .index("by_startedAt", ["startedAt"])
    .index("by_status", ["status"]),

  mondayHireEventBackfillJobs: defineTable({
    status: v.union(
      v.literal("running"),
      v.literal("done"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    workflowId: v.optional(v.string()),
    monthKey: v.string(),
    dateFrom: v.string(),
    dateTo: v.string(),
    dryRun: v.boolean(),
    contactBoardId: v.string(),
    subitemBoardId: v.optional(v.union(v.string(), v.null())),
    pageSize: v.number(),
    currentCursor: v.optional(v.union(v.string(), v.null())),
    processedContacts: v.number(),
    inRangeContacts: v.number(),
    createdEvents: v.number(),
    skippedEvents: v.number(),
    errorsCount: v.number(),
    startedAt: v.number(),
    updatedAt: v.number(),
    finishedAt: v.optional(v.union(v.number(), v.null())),
    lastError: v.optional(v.union(v.string(), v.null())),
  })
    .index("by_startedAt", ["startedAt"])
    .index("by_status", ["status"]),

  mondayTouchCsvExportJobs: defineTable({
    status: v.union(
      v.literal("running"),
      v.literal("done"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    workflowId: v.optional(v.string()),
    sourceTag: v.string(),
    baselineDate: v.string(),
    contactBoardId: v.string(),
    pageSize: v.number(),
    currentCursor: v.optional(v.union(v.string(), v.null())),
    processedContacts: v.number(),
    rowCount: v.number(),
    chunkCount: v.number(),
    startedAt: v.number(),
    updatedAt: v.number(),
    finishedAt: v.optional(v.union(v.number(), v.null())),
    lastError: v.optional(v.union(v.string(), v.null())),
  })
    .index("by_startedAt", ["startedAt"])
    .index("by_status", ["status"]),

  mondayTouchCsvExportChunks: defineTable({
    jobId: v.id("mondayTouchCsvExportJobs"),
    chunkIndex: v.number(),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_jobId_and_chunkIndex", ["jobId", "chunkIndex"]),

  mondayGlobalSettings: defineTable({
    key: v.string(),
    emailMarketingEnabled: v.boolean(),
    adminUserIds: v.optional(v.array(v.string())),
    employeeUserIds: v.optional(v.array(v.string())),
    replyToEmails: v.optional(v.array(v.string())),
    monthlyBoardMappings: v.optional(
      v.array(
        v.object({
          monthKey: v.string(),
          boardId: v.string(),
        }),
      ),
    ),
    updatedAt: v.number(),
    updatedByMondayUserId: v.string(),
  }).index("by_key", ["key"]),

  mondayUsers: defineTable({
    mondayAccountId: v.string(),
    mondayUserId: v.string(),
    mondayAppClientId: v.union(v.string(), v.null()),
    email: v.union(v.string(), v.null()),
    name: v.union(v.string(), v.null()),
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
    lastSeenSource: v.string(),
  })
    .index("by_account_and_user", ["mondayAccountId", "mondayUserId"])
    .index("by_account_and_user_and_app_client", [
      "mondayAccountId",
      "mondayUserId",
      "mondayAppClientId",
    ])
    .index("by_account", ["mondayAccountId"]),

  mondayUserFilterPresets: defineTable({
    accountId: v.string(),
    ownerMondayUserId: v.string(),
    name: v.string(),
    matchMode: v.union(v.literal("all"), v.literal("any")),
    conditions: v.array(mondayAdvancedFilterConditionValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdByMondayUserId: v.string(),
    updatedByMondayUserId: v.string(),
  })
    .index("by_account_and_owner", ["accountId", "ownerMondayUserId"])
    .index("by_account_and_owner_and_name", [
      "accountId",
      "ownerMondayUserId",
      "name",
    ]),

  mondayUserBoardSettings: defineTable({
    accountId: v.string(),
    ownerMondayUserId: v.string(),
    colorTheme: v.union(
      v.literal("neutral"),
      v.literal("sky"),
      v.literal("emerald"),
      v.literal("violet"),
      v.literal("rose"),
      v.literal("custom"),
    ),
    customTheme: v.optional(
      v.object({
        colorHex: v.string(),
        alpha: v.number(),
      }),
    ),
    fontSize: v.union(v.literal("default"), v.literal("medium"), v.literal("large")),
    tableDensity: v.optional(v.union(v.literal("expanded"), v.literal("compact"))),
    pageSize: v.optional(v.number()),
    displayMode: v.optional(v.union(v.literal("table"), v.literal("grid"))),
    recordSource: v.optional(
      v.union(v.literal("created_in_month"), v.literal("touched_in_month")),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    updatedByMondayUserId: v.string(),
  }).index("by_account_and_owner", ["accountId", "ownerMondayUserId"]),

  mondayMonthlyMigrationJobs: defineTable({
    status: v.union(
      v.literal("running"),
      v.literal("done"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    workflowId: v.optional(v.string()),
    sourceBoardId: v.string(),
    sourceBoardName: v.optional(v.union(v.string(), v.null())),
    targetBoardId: v.string(),
    monthTag: v.string(),
    dryRun: v.boolean(),
    includeParentUpdates: v.boolean(),
    includeSubitems: v.boolean(),
    includeSubitemUpdates: v.boolean(),
    pageSize: v.number(),
    currentCursor: v.optional(v.union(v.string(), v.null())),
    processedContacts: v.number(),
    mappedContacts: v.number(),
    skippedContacts: v.number(),
    createdParentUpdates: v.number(),
    createdSubitems: v.number(),
    createdSubitemUpdates: v.number(),
    updateProgressColumns: v.optional(v.boolean()),
    updatedProgressColumns: v.optional(v.number()),
    monthKey: v.optional(v.string()),
    createdTouchRecords: v.optional(v.number()),
    errorsCount: v.number(),
    warningsCount: v.number(),
    startedAt: v.number(),
    updatedAt: v.number(),
    finishedAt: v.optional(v.union(v.number(), v.null())),
    lastError: v.optional(v.union(v.string(), v.null())),
  })
    .index("by_startedAt", ["startedAt"])
    .index("by_status", ["status"]),

  mondayMonthlyMigrationEntries: defineTable({
    jobId: v.id("mondayMonthlyMigrationJobs"),
    sourceBoardId: v.string(),
    sourceEntityType: v.union(
      v.literal("parent_update"),
      v.literal("subitem"),
      v.literal("subitem_update"),
    ),
    sourceEntityId: v.string(),
    sourceItemId: v.string(),
    targetItemId: v.string(),
    targetEntityId: v.optional(v.union(v.string(), v.null())),
    createdAt: v.number(),
  })
    .index("by_jobId", ["jobId"])
    .index("by_sourceBoardId_and_sourceItemId", ["sourceBoardId", "sourceItemId"])
    .index("by_sourceBoardId_and_sourceEntityType_and_sourceEntityId", [
      "sourceBoardId",
      "sourceEntityType",
      "sourceEntityId",
    ]),

  mondayBulkSyncJobs: defineTable({
    status: v.union(
      v.literal("running"),
      v.literal("done"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    mondayAccountId: v.string(),
    requestedByMondayUserId: v.string(),
    requestedByMondayAppClientId: v.union(v.string(), v.null()),
    ownerId: v.string(),
    contactItemIds: v.array(v.string()),
    monthlyBoardMappings: v.array(
      v.object({
        monthKey: v.string(),
        boardId: v.string(),
      }),
    ),
    totalContacts: v.number(),
    nextIndex: v.number(),
    processedContacts: v.number(),
    succeededContacts: v.number(),
    failedContacts: v.number(),
    warningsCount: v.number(),
    startedAt: v.number(),
    updatedAt: v.number(),
    finishedAt: v.optional(v.union(v.number(), v.null())),
    lastError: v.optional(v.union(v.string(), v.null())),
  })
    .index("by_startedAt", ["startedAt"])
    .index("by_status", ["status"])
    .index("by_account_and_startedAt", ["mondayAccountId", "startedAt"]),

  mondayBulkSyncJobResults: defineTable({
    jobId: v.id("mondayBulkSyncJobs"),
    contactItemId: v.string(),
    status: v.union(v.literal("success"), v.literal("failed")),
    linkedItemCount: v.number(),
    createdParentUpdates: v.number(),
    createdSubitems: v.number(),
    createdSubitemUpdates: v.number(),
    updatedProgressColumns: v.number(),
    skippedSubitems: v.number(),
    warnings: v.array(v.string()),
    error: v.union(v.string(), v.null()),
    attemptedAt: v.number(),
  })
    .index("by_jobId", ["jobId"])
    .index("by_jobId_and_contactItemId", ["jobId", "contactItemId"]),

  outlookConnections: defineTable({
    mondayAccountId: v.string(),
    mondayUserId: v.string(),
    mondayAppClientId: v.union(v.string(), v.null()),
    email: v.union(v.string(), v.null()),
    displayName: v.union(v.string(), v.null()),
    tenantId: v.string(),
    clientId: v.string(),
    encryptedAccessToken: v.union(v.string(), v.null()),
    encryptedRefreshToken: v.string(),
    accessTokenExpiresAt: v.number(),
    scopes: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_monday_identity", [
      "mondayAccountId",
      "mondayUserId",
      "mondayAppClientId",
    ])
    .index("by_monday_user", ["mondayAccountId", "mondayUserId"]),

  outlookOutboundMessages: defineTable({
    mondayAccountId: v.string(),
    mondayUserId: v.string(),
    actingMondayUserId: v.optional(v.string()),
    mondayAppClientId: v.union(v.string(), v.null()),
    connectionEmail: v.union(v.string(), v.null()),
    contactItemId: v.union(v.string(), v.null()),
    recipientEmail: v.string(),
    subject: v.string(),
    sentAt: v.number(),
    graphMessageId: v.union(v.string(), v.null()),
    internetMessageId: v.union(v.string(), v.null()),
    conversationId: v.union(v.string(), v.null()),
    correlationToken: v.union(v.string(), v.null()),
    status: v.union(v.literal("pending_lookup"), v.literal("identified")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_internetMessageId", ["internetMessageId"])
    .index("by_conversationId", ["conversationId"])
    .index("by_contactItemId", ["contactItemId"])
    .index("by_correlationToken", ["correlationToken"])
    .index("by_identity_and_sentAt", [
      "mondayAccountId",
      "mondayUserId",
      "sentAt",
    ]),

  outlookInboundMessages: defineTable({
    dedupeKey: v.string(),
    internetMessageId: v.union(v.string(), v.null()),
    graphMessageId: v.string(),
    conversationId: v.union(v.string(), v.null()),
    inReplyTo: v.union(v.string(), v.null()),
    fromEmail: v.string(),
    subject: v.string(),
    receivedAt: v.number(),
    rawBodyPreview: v.union(v.string(), v.null()),
    parsedBody: v.union(v.string(), v.null()),
    correlationMethod: v.union(
      v.literal("inReplyTo"),
      v.literal("conversationId"),
      v.literal("senderEmail"),
      v.literal("none"),
      v.null(),
    ),
    correlationConfidence: v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low"),
      v.null(),
    ),
    outboundMessageId: v.optional(v.id("outlookOutboundMessages")),
    contactItemId: v.union(v.string(), v.null()),
    matchedContactEmail: v.union(v.string(), v.null()),
    status: v.union(
      v.literal("received"),
      v.literal("parsed"),
      v.literal("mirrored"),
      v.literal("failed"),
      v.literal("ignored"),
    ),
    mirrorMondayUpdateId: v.union(v.string(), v.null()),
    mirrorMondaySubitemId: v.union(v.string(), v.null()),
    mirrorTouchId: v.union(v.string(), v.null()),
    errorMessage: v.union(v.string(), v.null()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_dedupeKey", ["dedupeKey"])
    .index("by_internetMessageId", ["internetMessageId"])
    .index("by_conversationId", ["conversationId"])
    .index("by_contactItemId", ["contactItemId"])
    .index("by_status_and_updatedAt", ["status", "updatedAt"]),

  outlookGraphSubscriptions: defineTable({
    mondayAccountId: v.string(),
    mondayUserId: v.string(),
    mondayAppClientId: v.union(v.string(), v.null()),
    connectionEmail: v.union(v.string(), v.null()),
    subscriptionId: v.string(),
    clientState: v.string(),
    resource: v.string(),
    changeType: v.string(),
    notificationUrl: v.string(),
    expirationDateTime: v.string(),
    expirationTimestamp: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("expired"),
      v.literal("deleted"),
      v.literal("error"),
    ),
    lastRenewedAt: v.union(v.number(), v.null()),
    lastError: v.union(v.string(), v.null()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_subscriptionId", ["subscriptionId"])
    .index("by_status_and_expirationTimestamp", ["status", "expirationTimestamp"])
    .index("by_monday_identity", [
      "mondayAccountId",
      "mondayUserId",
      "mondayAppClientId",
    ]),

});
