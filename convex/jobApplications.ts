import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const apply = mutation({
  args: {
    jobId: v.id("jobs"),
    userId: v.id("users"),
    coverLetter: v.optional(v.string()),
  },
  returns: v.id("jobApplications"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("jobApplications")
      .withIndex("by_jobId_and_userId", (q) =>
        q.eq("jobId", args.jobId).eq("userId", args.userId),
      )
      .unique();
    if (existing) return existing._id;

    return await ctx.db.insert("jobApplications", {
      jobId: args.jobId,
      userId: args.userId,
      coverLetter: args.coverLetter?.trim() ? args.coverLetter.trim() : undefined,
      createdAt: Date.now(),
    });
  },
});

export const listByUser = query({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      _id: v.id("jobApplications"),
      _creationTime: v.number(),
      jobId: v.id("jobs"),
      userId: v.id("users"),
      coverLetter: v.optional(v.string()),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("jobApplications")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(100);
  },
});

