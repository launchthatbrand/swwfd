// Convex auth config (JWT providers).
// This is required for Convex Auth tokens (issued by CONVEX_SITE_URL) to be
// recognized by Convex when Next.js middleware calls `isAuthenticated()`.
//
// NOTE: Convex v1.23+ doesn't export `AuthConfig` type from `convex/server`.
export default {
  providers: [
    {
      // For Convex Auth, the issuer is the deployment's .site URL.
      domain: process.env.CONVEX_SITE_URL!,
      applicationID: "convex",
    },
  ],
};

