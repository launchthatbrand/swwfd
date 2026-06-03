import { api as apiGenerated } from "@convex-config/_generated/api";

import { createConvexMutationRouteNoBody } from "../../_createToolRoute";

export const runtime = "nodejs";

const apiAny = apiGenerated as any;

export const { POST } = createConvexMutationRouteNoBody({
  mutation: apiAny.mondayTouchRangeBackfill.cancelRangeBackfill,
  errorLabel: "Failed to cancel touch range backfill",
});
