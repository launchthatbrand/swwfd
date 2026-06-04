import { defineApp } from "convex/server";
import workflow from "@convex-dev/workflow/convex.config";
import swwfd_ai from "@swwfd/ai/convex/component/convex.config";
import swwfd_support from "@swwfd/plugin-support/convex/component/convex.config";

const app = defineApp();

app.use(workflow);
app.use(swwfd_ai);
app.use(swwfd_support);

export default app;
