import { api as apiGenerated } from "@convex-config/_generated/api";

import { createConvexMutationRouteNoBody } from "../../_createToolRoute";

export const runtime = "nodejs";

const apiAny = apiGenerated as any;

export const { POST } = createConvexMutationRouteNoBody({
  mutation: apiAny.mondayHireEventBackfill.cancelBackfill,
  errorLabel: "Failed to cancel hire event backfill",
});
