import { createAppConnectionsWrappers } from "@acme/activepieces-convex/app-wrappers";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { query } from "../_generated/server";

const wrappers = createAppConnectionsWrappers(components);

export const listConnections = query({
  ...wrappers.queries.listConnections,
  returns: v.any(),
});

export const getConnectionToken = query({
  ...wrappers.queries.getConnectionToken,
  returns: v.any(),
});
