import { createPiecesWrappers } from "@launchthatbrand/activepieces-convex/app-wrappers";
import { v } from "convex/values";

import { components } from "../_generated/api";
import { action } from "../_generated/server";

const wrappers = createPiecesWrappers(components);

export const pieceOptions = action({
  ...wrappers.actions.pieceOptions,
  returns: v.any(),
});

export const testTriggerRecipe = action({
  ...wrappers.actions.testTriggerRecipe,
  returns: v.any(),
});

export const executeActionRecipe = action({
  ...wrappers.actions.executeActionRecipe,
  returns: v.any(),
});
