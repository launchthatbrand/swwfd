import { ConvexHttpClient } from "convex/browser";
import { env } from "~/env";

export const getConvexHttpClient = () => {
  return new ConvexHttpClient(String(env.NEXT_PUBLIC_CONVEX_URL));
};

