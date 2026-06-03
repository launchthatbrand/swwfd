import { api as apiGenerated } from "@convex-config/_generated/api";

import { createConvexMutationRoute } from "../../_createToolRoute";

export const runtime = "nodejs";

const apiAny = apiGenerated as any;

export const { POST } = createConvexMutationRoute({
  mutation: apiAny.mondayMonthlyMigration.cancelMigration,
  validate: (body) => ({ jobId: body.jobId }),
  errorLabel: "Failed to cancel monthly migration",
});
