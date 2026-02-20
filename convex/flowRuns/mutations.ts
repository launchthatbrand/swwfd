import { createFlowRunsWrappers } from "@launchthatbrand/activepieces-convex/app-wrappers";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation } from "../_generated/server";

const wrappers = createFlowRunsWrappers(components);

export const createRun = mutation({
  ...wrappers.mutations.createRun,
  returns: v.any(),
});

export const cancelRun = mutation({
  ...wrappers.mutations.cancelRun,
  returns: v.any(),
});

export const testFlow = mutation({
  ...wrappers.mutations.testFlow,
  returns: v.any(),
});

