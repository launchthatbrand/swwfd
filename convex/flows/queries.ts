import { createFlowsWrappers } from "@launchthatbrand/activepieces-convex/app-wrappers";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { query } from "../_generated/server";

const wrappers = createFlowsWrappers(components, internal);

export const listFlows = query({
  ...wrappers.queries.listFlows,
  returns: v.any(),
});

export const getFlow = query({
  ...wrappers.queries.getFlow,
  returns: v.any(),
});

export const getFlowVersion = query({
  ...wrappers.queries.getFlowVersion,
  returns: v.any(),
});

export const listVersions = query({
  ...wrappers.queries.listVersions,
  returns: v.any(),
});
