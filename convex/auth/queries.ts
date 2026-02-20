import { createAuthWrappers } from "@launchthatbrand/activepieces-convex/app-wrappers";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { query } from "../_generated/server";

const wrappers = createAuthWrappers(components);

export const getSessionContext = query({
  ...wrappers.queries.getSessionContext,
  returns: v.any(),
});

export const listUserPlatforms = query({
  ...wrappers.queries.listUserPlatforms,
  returns: v.any(),
});

export const listProjectsForCurrentPlatform = query({
  ...wrappers.queries.listProjectsForCurrentPlatform,
  returns: v.any(),
});

