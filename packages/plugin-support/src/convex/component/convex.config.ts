import { defineComponent } from "convex/server";
import presence from "@convex-dev/presence/convex.config.js";

// import workpool from "@convex-dev/workpool/convex.config.js";
// import localComponent from "../localComponent/convex.config.js";
const component = defineComponent("swwfd_support");
// component.use(workpool);
// component.use(localComponent, { name: "customName" });
component.use(presence);
export default component;
