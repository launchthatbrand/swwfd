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
  }).index("email", ["email"]),

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
});
