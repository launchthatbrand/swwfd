import { v } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import { ensureUniqueSlug, metaValueValidator, sanitizeSlug } from "./helpers";

export const createPost = mutation({
  args: {
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
    featuredImage: v.optional(v.string()),
    postTypeSlug: v.string(),
    meta: v.optional(v.record(v.string(), metaValueValidator)),
    organizationId: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const organizationId = args.organizationId ?? "";
    if (!organizationId) {
      throw new Error("organizationId is required for support posts");
    }

    const normalizedSlug =
      sanitizeSlug(args.slug) || `${args.postTypeSlug}-${Date.now()}`;
    const uniqueSlug = await ensureUniqueSlug(ctx, normalizedSlug, organizationId);
    const timestamp = Date.now();

    const identity = await ctx.auth.getUserIdentity();
    const authorId =
      identity?.subject ?? identity?.tokenIdentifier ?? undefined;

    const postId = await ctx.db.insert("posts", {
      title: args.title,
      content: args.content,
      excerpt: args.excerpt,
      slug: uniqueSlug,
      status: args.status,
      category: args.category,
      tags: args.tags,
      featuredImageUrl: args.featuredImage,
      postTypeSlug: args.postTypeSlug.toLowerCase(),
      organizationId,
      authorId,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    if (args.meta) {
      for (const [key, value] of Object.entries(args.meta)) {
        await ctx.db.insert("postsMeta", {
          postId,
          key,
          value: value ?? null,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }
    }

    return postId as unknown as string;
  },
});

export const updatePost = mutation({
  args: {
    id: v.string(),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    excerpt: v.optional(v.string()),
    slug: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("published"),
        v.literal("draft"),
        v.literal("archived"),
      ),
    ),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    featuredImage: v.optional(v.string()),
    meta: v.optional(v.record(v.string(), metaValueValidator)),
    organizationId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = (await ctx.db.get(args.id as any)) as Doc<"posts"> | null;
    if (!existing) throw new Error("Post not found");
    if (args.organizationId && existing.organizationId !== args.organizationId) {
      throw new Error("Forbidden");
    }

    const timestamp = Date.now();
    const patch: Record<string, unknown> = { updatedAt: timestamp };

    if (args.title !== undefined) patch.title = args.title;
    if (args.content !== undefined) patch.content = args.content;
    if (args.excerpt !== undefined) patch.excerpt = args.excerpt;
    if (args.status !== undefined) patch.status = args.status;
    if (args.category !== undefined) patch.category = args.category;
    if (args.tags !== undefined) patch.tags = args.tags;
    if (args.featuredImage !== undefined) patch.featuredImageUrl = args.featuredImage;

    if (args.slug !== undefined) {
      const organizationId = existing.organizationId;
      const normalizedSlug = sanitizeSlug(args.slug);
      patch.slug = normalizedSlug
        ? await ensureUniqueSlug(ctx, normalizedSlug, organizationId)
        : existing.slug;
    }

    await ctx.db.patch(existing._id, patch);

    if (args.meta) {
      for (const [key, value] of Object.entries(args.meta)) {
        const existingMeta = await ctx.db
          .query("postsMeta")
          .withIndex("by_post_and_key", (q) =>
            q.eq("postId", existing._id as Id<"posts">).eq("key", key),
          )
          .unique();
        if (existingMeta) {
          await ctx.db.patch(existingMeta._id, { value: value ?? null, updatedAt: timestamp });
        } else {
          await ctx.db.insert("postsMeta", {
            postId: existing._id as Id<"posts">,
            key,
            value: value ?? null,
            createdAt: timestamp,
            updatedAt: timestamp,
          });
        }
      }
    }

    return null;
  },
});

export const deletePost = mutation({
  args: {
    id: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = (await ctx.db.get(args.id as any)) as Doc<"posts"> | null;
    if (!existing) return null;
    const meta = await ctx.db
      .query("postsMeta")
      .withIndex("by_post", (q) => q.eq("postId", existing._id as Id<"posts">))
      .collect();
    for (const row of meta) {
      await ctx.db.delete(row._id);
    }
    await ctx.db.delete(existing._id);
    return null;
  },
});


