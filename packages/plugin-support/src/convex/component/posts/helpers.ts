import { v } from "convex/values";

import type { QueryCtx } from "../_generated/server";

export const metaValueValidator = v.union(
  v.string(),
  v.number(),
  v.boolean(),
  v.null(),
);

export const sanitizeSlug = (slug: string) =>
  slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export const ensureUniqueSlug = async (
  ctx: QueryCtx,
  slug: string,
  organizationId: string,
) => {
  const existing = await ctx.db
    .query("posts")
    .withIndex("by_org_slug", (q) =>
      q.eq("organizationId", organizationId).eq("slug", slug),
    )
    .unique();

  if (!existing) return slug;
  const suffix = Math.random().toString(36).slice(-6);
  return `${slug}-${suffix}`.toLowerCase();
};


