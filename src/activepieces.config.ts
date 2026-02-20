import { buildActivepiecesConfig } from "@launchthatbrand/activepieces-ui";
import { env } from "~/env";

const config = buildActivepiecesConfig({
  basePath: "/admin/automations",
  backend: {
    type: "convex",
    url: env.NEXT_PUBLIC_CONVEX_URL,
  },
  // Activepieces UI currently expects `provider: "clerk"` in types, but we supply
  // the token from Convex Auth via `getAuthToken` on the page component.
  auth: {
    provider: "clerk",
    // Activepieces internal codepaths assume this key in a few places.
    tokenStorageKey: "token",
    onLogin: async (token: string) => {
      localStorage.setItem("token", token);
    },
    onLogout: async () => {
      localStorage.removeItem("token");
    },
  },
  ui: {
    branding: {
      appName: "SWWFD Automations",
    },
  },
  routing: {
    autoSwitchProject: true,
  },
});

export default config;

