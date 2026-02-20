import { createPiecesWrappers } from "@launchthatbrand/activepieces-convex/app-wrappers";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { query } from "../_generated/server";

const wrappers = createPiecesWrappers(components);

// The embedded UI and `ConvexDataClient` historically call these names.
export const listPieces = query({
  ...wrappers.queries.list,
  returns: v.any(),
});

export const getPiece = query({
  ...wrappers.queries.get,
  returns: v.any(),
});

export const list = query({
  ...wrappers.queries.list,
  returns: v.any(),
});

export const get = query({
  ...wrappers.queries.get,
  returns: v.any(),
});

export const getById = query({
  ...wrappers.queries.getById,
  returns: v.any(),
});

export const listByCategory = query({
  ...wrappers.queries.listByCategory,
  returns: v.any(),
});

export const count = query({
  ...wrappers.queries.count,
  returns: v.any(),
});
