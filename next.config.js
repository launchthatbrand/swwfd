import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);

// Import env files to validate at build time. Use jiti so we can load .ts files in here.
await jiti.import("./src/env");

/** @type {import("next").NextConfig} */
const config = {
  /** Enables hot reloading for local packages without a build step */
  transpilePackages: [
    "@acme/api",
    "@launchthatbrand/activepieces-backend-adapter",
    "@launchthatbrand/activepieces-convex",
    "@launchthatbrand/activepieces-next",
    "@launchthatbrand/activepieces-pieces",
    "@launchthatbrand/activepieces-ui",
    "@launchthatbrand/activepieces-validation",
    "@acme/db",
    "@acme/konva",
    "@acme/ui",
    "@acme/validators",
    "launchthat-plugin-core-tenant",
    "launchthat-plugin-ecommerce",
    "launchthat-plugin-ecommerce-stripe",
    "launchthat-plugin-access",
  ],

  /** We already do linting and typechecking as separate tasks in CI */
  typescript: { ignoreBuildErrors: true },

  /** Empty turbopack config to silence Next.js 16 warning */
  turbopack: {},

  /** Webpack configuration for Spline runtime (used in production builds) */
  webpack: (config) => {
    config.externals.push({
      "utf-8-validate": "commonjs utf-8-validate",
      bufferutil: "commonjs bufferutil",
    });
    return config;
  },
};

export default config;
