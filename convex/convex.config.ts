import { defineApp } from "convex/server";
import workflow from "@convex-dev/workflow/convex.config";
import swwfd_ai from "../packages/ai/src/convex/component/convex.config";
import swwfd_support from "../packages/plugin-support/src/convex/component/convex.config";

const app = defineApp();

app.use(workflow);
app.use(swwfd_ai);
app.use(swwfd_support);

export default app;
