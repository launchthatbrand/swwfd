import { createAppConnectionsWrappers } from "@acme/activepieces-convex/app-wrappers";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation } from "../_generated/server";

const wrappers = createAppConnectionsWrappers(components);

export const upsertConnection = mutation({
  ...wrappers.mutations.upsertConnection,
  returns: v.any(),
});

export const deleteConnection = mutation({
  ...wrappers.mutations.deleteConnection,
  returns: v.any(),
});
