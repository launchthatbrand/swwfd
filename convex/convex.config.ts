import { defineApp } from "convex/server";
import workflow from "@convex-dev/workflow/convex.config";
import activepieces from "@launchthatbrand/activepieces-convex/convex.config";
import launchthat_access from "../../../packages/plugins/access/src/convex/component/convex.config";
import launchthat_affiliates from "../../../packages/plugins/affiliates/src/convex/component/convex.config";
import launchthat_core_tenant from "../../../packages/plugins/core-tenant/src/convex/component/convex.config";
import launchthat_crm from "../../../packages/plugins/crm/src/convex/component/convex.config";
import launchthat_discord from "../../../packages/plugins/discord/src/convex/component/convex.config";
import launchthat_ecommerce from "../../../packages/plugins/ecommerce/src/convex/component/convex.config";
import launchthat_email from "../../../packages/plugins/email/src/convex/component/convex.config";
import launchthat_feedback from "../../../packages/plugins/feedback/src/convex/component/convex.config";
import launchthat_joincodes from "../../../packages/plugins/joincodes/src/convex/component/convex.config";
import launchthat_notifications from "../../../packages/plugins/notifications/src/convex/component/convex.config";
import launchthat_onboarding from "../../../packages/plugins/onboarding/src/convex/component/convex.config";
import launchthat_observability from "../../../packages/plugins/observability/src/convex/component/convex.config";
import launchthat_push from "../../../packages/plugins/push/src/convex/component/convex.config";
import launchthat_shortlinks from "../../../packages/plugins/shortlinks/src/convex/component/convex.config";

const app = defineApp();

// Durable workflow runtime used by Activepieces.
app.use(workflow);
app.use(activepieces);

app.use(launchthat_core_tenant);
app.use(launchthat_notifications);
app.use(launchthat_push);
app.use(launchthat_email);
app.use(launchthat_feedback);
app.use(launchthat_crm);
app.use(launchthat_ecommerce);
app.use(launchthat_joincodes);
app.use(launchthat_affiliates);
app.use(launchthat_discord);
app.use(launchthat_onboarding);
app.use(launchthat_access);
app.use(launchthat_observability);
app.use(launchthat_shortlinks);

export default app;
