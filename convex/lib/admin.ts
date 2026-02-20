import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export const requireAdmin = async (
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
) => {
  const user = await ctx.db.get(userId);
  if (!user || user.isAdmin !== true) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
};

