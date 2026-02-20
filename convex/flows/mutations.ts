import { createFlowsWrappers } from "@acme/activepieces-convex/app-wrappers";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { mutation } from "../_generated/server";

const wrappers = createFlowsWrappers(components, internal);

export const createFlow = mutation({
  ...wrappers.mutations.createFlow,
  returns: v.any(),
});

export const updateFlow = mutation({
  ...wrappers.mutations.updateFlow,
  returns: v.any(),
});

export const deleteFlow = mutation({
  ...wrappers.mutations.deleteFlow,
  returns: v.any(),
});

export const publishFlow = mutation({
  ...wrappers.mutations.publishFlow,
  returns: v.any(),
});

export const changeFlowStatus = mutation({
  ...wrappers.mutations.changeFlowStatus,
  returns: v.any(),
});
