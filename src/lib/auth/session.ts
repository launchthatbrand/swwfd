import { env } from "~/env";

export const SWWFD_SESSION_COOKIE_NAME =
  env.SWWFD_SESSION_COOKIE_NAME ?? "swwfd_session";

export const SWWFD_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

export const getSessionCookieOptions = () => {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: SWWFD_SESSION_TTL_SECONDS,
  };
};

