import { createSampleDataWrappers } from "@launchthatbrand/activepieces-convex/app-wrappers";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { query } from "../_generated/server";

const wrappers = createSampleDataWrappers(components);

export const getSampleData = query({
  ...wrappers.queries.getSampleData,
  returns: v.any(),
});

export const getAllSampleDataForFlowVersion = query({
  ...wrappers.queries.getAllSampleDataForFlowVersion,
  returns: v.any(),
});

