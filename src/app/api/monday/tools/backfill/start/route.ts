import { api as apiGenerated } from "@convex-config/_generated/api";

import { createConvexMutationRoute } from "../../_createToolRoute";

export const runtime = "nodejs";

const apiAny = apiGenerated as any;

export const { POST } = createConvexMutationRoute({
  mutation: apiAny.mondayTouchBackfill.startBackfill,
  validate: (body) => ({
    baselineDate: body.baselineDate,
    sourceTag: body.sourceTag,
    pageSize: body.pageSize,
  }),
  errorLabel: "Failed to start backfill",
});
