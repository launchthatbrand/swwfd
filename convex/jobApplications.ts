import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const apply = mutation({
  args: {
    jobId: v.id("jobs"),
    coverLetter: v.optional(v.string()),
  },
  returns: v.id("jobApplications"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("UNAUTHORIZED");
    }

    const existing = await ctx.db
      .query("jobApplications")
      .withIndex("by_jobId_and_userId", (q) =>
        q.eq("jobId", args.jobId).eq("userId", userId),
      )
      .unique();
    if (existing) return existing._id;

    return await ctx.db.insert("jobApplications", {
      jobId: args.jobId,
      userId,
      coverLetter: args.coverLetter?.trim() ? args.coverLetter.trim() : undefined,
      createdAt: Date.now(),
    });
  },
});

export const listMine = query({
  args: {},
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
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("jobApplications")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(100);
  },
});

