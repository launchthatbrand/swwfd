import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireAdmin } from "./lib/admin";

export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("jobs"),
      _creationTime: v.number(),
      title: v.string(),
      company: v.string(),
      location: v.string(),
      description: v.string(),
      tags: v.array(v.string()),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(200, Math.floor(args.limit ?? 50)));
    return await ctx.db
      .query("jobs")
      .withIndex("by_createdAt", (q) => q)
      .order("desc")
      .take(limit);
  },
});

export const get = query({
  args: { jobId: v.id("jobs") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("jobs"),
      _creationTime: v.number(),
      title: v.string(),
      company: v.string(),
      location: v.string(),
      description: v.string(),
      tags: v.array(v.string()),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    return job;
  },
});

// Dev helper so you can quickly create a job from the Convex dashboard.
export const create = mutation({
  args: {
    title: v.string(),
    company: v.string(),
    location: v.string(),
    description: v.string(),
    tags: v.optional(v.array(v.string())),
  },
  returns: v.id("jobs"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("UNAUTHORIZED");
    await requireAdmin(ctx, userId);

    return await ctx.db.insert("jobs", {
      title: args.title.trim(),
      company: args.company.trim(),
      location: args.location.trim(),
      description: args.description.trim(),
      tags: (args.tags ?? []).map((t) => t.trim()).filter(Boolean),
      createdAt: Date.now(),
    });
  },
});

