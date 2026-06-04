import agent from "@convex-dev/agent/convex.config";
import { defineComponent } from "convex/server";
import neutralCost from "neutral-cost/convex.config";
import rag from "@convex-dev/rag/convex.config";
import swwfdLangfuse from "@swwfd/plugin-langfuse/convex/component/convex.config";

const component = defineComponent("swwfd_ai");
component.use(agent, { name: "agent" });
component.use(rag, { name: "rag" });
component.use(neutralCost, { name: "neutralCost" });
component.use(swwfdLangfuse, { name: "langfuse" });
// component.use(launchthat_news, { name: "news" });

export default component;
