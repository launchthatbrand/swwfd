import { createPiecesWrappers } from "@launchthatbrand/activepieces-convex/app-wrappers";
import { v } from "convex/values";

import { components } from "../_generated/api";
import { mutation } from "../_generated/server";

const wrappers = createPiecesWrappers(components);

export const importPieces = mutation({
  ...wrappers.mutations.importPieces,
  returns: v.any(),
});
