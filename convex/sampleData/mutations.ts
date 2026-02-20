import { createSampleDataWrappers } from "@launchthatbrand/activepieces-convex/app-wrappers";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation } from "../_generated/server";

const wrappers = createSampleDataWrappers(components);

export const saveSampleData = mutation({
  ...wrappers.mutations.saveSampleData,
  returns: v.any(),
});

export const getSampleDataMutation = mutation({
  ...wrappers.mutations.getSampleDataMutation,
  returns: v.any(),
});

export const deleteSampleDataForStep = mutation({
  ...wrappers.mutations.deleteSampleDataForStep,
  returns: v.any(),
});

export const deleteSampleDataForFlowVersion = mutation({
  ...wrappers.mutations.deleteSampleDataForFlowVersion,
  returns: v.any(),
});

