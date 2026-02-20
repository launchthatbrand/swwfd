import { createFlowRunsWrappers } from "@acme/activepieces-convex/app-wrappers";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { query } from "../_generated/server";

const wrappers = createFlowRunsWrappers(components);

export const getRun = query({
  ...wrappers.queries.getRun,
  returns: v.any(),
});

export const listRuns = query({
  ...wrappers.queries.listRuns,
  returns: v.any(),
});

export const getStepRuns = query({
  ...wrappers.queries.getStepRuns,
  returns: v.any(),
});

export const getOutput = query({
  ...wrappers.queries.getOutput,
  returns: v.any(),
});

export const deriveOrderedSteps = query({
  ...wrappers.queries.deriveOrderedSteps,
  returns: v.any(),
});

