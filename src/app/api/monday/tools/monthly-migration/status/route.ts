import { api as apiGenerated } from "@convex-config/_generated/api";

import { createConvexQueryRoute } from "../../_createToolRoute";

export const runtime = "nodejs";

const apiAny = apiGenerated as any;

export const { GET } = createConvexQueryRoute({
  query: apiAny.mondayMonthlyMigration.getLatestJob,
  errorLabel: "Failed to load monthly migration status",
});
