import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);

await jiti.import("./src/env");

/** @type {import("next").NextConfig} */
const config = {
  transpilePackages: [
    "@launchthatapp/ui",
    "@launchthatapp/dnd",
    "@swwfd/ai",
    "@swwfd/admin-runtime",
    "@swwfd/plugin-core",
    "@swwfd/plugin-langfuse",
    "@swwfd/plugin-support",
    "@swwfd/support-chat-composer",
    "@swwfd/ui-lexical",
  ],

  typescript: { ignoreBuildErrors: true },

  turbopack: {},
};

export default config;
