import { defineSchema, defineTable } from "convex/server";

import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

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

});
