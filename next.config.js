import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);

await jiti.import("./src/env");

/** @type {import("next").NextConfig} */
const config = {
  transpilePackages: ["@launchthatapp/ui"],

  typescript: { ignoreBuildErrors: true },

  turbopack: {},
};

export default config;
