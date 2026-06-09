import { v } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import { query } from "../_generated/server";

export const getAllPosts = query({
  args: {
    organizationId: v.optional(v.string()),
    filters: v.optional(
      v.object({
        status: v.optional(
          v.union(
            v.literal("published"),
            v.literal("draft"),
            v.literal("archived"),
          ),
        ),
        category: v.optional(v.string()),
        authorId: v.optional(v.string()),
        postTypeSlug: v.optional(v.string()),
        limit: v.optional(v.number()),
      }),
    ),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const organizationId = args.organizationId ?? "";
    const postTypeSlug = args.filters?.postTypeSlug?.toLowerCase();

    let qb = ctx.db
      .query("posts")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId));

    if (postTypeSlug) {
      qb = ctx.db
        .query("posts")
        .withIndex("by_org_postTypeSlug", (q) =>
          q
            .eq("organizationId", organizationId)
            .eq("postTypeSlug", postTypeSlug),
        );
    }

    const status = args.filters?.status;
    if (status) {
      qb = qb.filter((q) => q.eq(q.field("status"), status));
    }

    const limit = args.filters?.limit ?? 200;
    return await qb.order("desc").take(limit);
  },
});

export const getPostById = query({
  args: {
    id: v.string(),
    organizationId: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const post = (await ctx.db.get(args.id as any)) as Doc<"posts"> | null;
    if (!post) return null;
    if (args.organizationId && post.organizationId !== args.organizationId)
      return null;
    return post;
  },
});

export const getPostBySlug = query({
  args: {
    slug: v.string(),
    organizationId: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (!args.organizationId) return null;
    const slug = args.slug.toLowerCase();
    const post = await ctx.db
      .query("posts")
      .withIndex("by_org_slug", (q) =>
        q.eq("organizationId", args.organizationId!).eq("slug", slug),
      )
      .unique();
    return post ?? null;
  },
});

export const getPostMeta = query({
  args: {
    postId: v.string(),
    organizationId: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const post = (await ctx.db.get(args.postId as any)) as Doc<"posts"> | null;
    if (!post) return [];
    if (args.organizationId && post.organizationId !== args.organizationId)
      return [];

    return await ctx.db
      .query("postsMeta")
      .withIndex("by_post", (q) => q.eq("postId", post._id as Id<"posts">))
      .collect();
  },
});
