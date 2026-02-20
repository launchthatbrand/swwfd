import { defineApp } from "convex/server";
import workflow from "@convex-dev/workflow/convex.config";
import activepieces from "@acme/activepieces-convex/convex.config";
import launchthat_access from "../../../packages/launchthat-plugin-access/src/convex/component/convex.config";
import launchthat_affiliates from "../../../packages/launchthat-plugin-affiliates/src/convex/component/convex.config";
import launchthat_core_tenant from "../../../packages/launchthat-plugin-core-tenant/src/convex/component/convex.config";
import launchthat_crm from "../../../packages/launchthat-plugin-crm/src/convex/component/convex.config";
import launchthat_discord from "../../../packages/launchthat-plugin-discord/src/convex/component/convex.config";
import launchthat_ecommerce from "../../../packages/launchthat-plugin-ecommerce/src/convex/component/convex.config";
import launchthat_email from "../../../packages/launchthat-plugin-email/src/convex/component/convex.config";
import launchthat_feedback from "../../../packages/launchthat-plugin-feedback/src/convex/component/convex.config";
import launchthat_joincodes from "../../../packages/launchthat-plugin-joincodes/src/convex/component/convex.config";
import launchthat_notifications from "../../../packages/launchthat-plugin-notifications/src/convex/component/convex.config";
import launchthat_onboarding from "../../../packages/launchthat-plugin-onboarding/src/convex/component/convex.config";
import launchthat_observability from "../../../packages/launchthat-plugin-observability/src/convex/component/convex.config";
import launchthat_push from "../../../packages/launchthat-plugin-push/src/convex/component/convex.config";
import launchthat_shortlinks from "../../../packages/launchthat-plugin-shortlinks/src/convex/component/convex.config";

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
