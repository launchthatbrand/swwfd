import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
} from "@convex-dev/auth/nextjs/server";
import { NextResponse } from "next/server";

const isAuthPage = createRouteMatcher(["/sign-in"]);
const isSignUpPage = createRouteMatcher(["/sign-up"]);
const isFormsPage = createRouteMatcher(["/forms(.*)"]);
const isMondayPage = createRouteMatcher(["/monday(.*)"]);
const mondayRefererPattern = /^https?:\/\/([^.]+\.)?monday\.com(\/|$)/i;
const mondayEmbedCsp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors https://monday.com https://*.monday.com",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' https:",
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https:",
  "upgrade-insecure-requests",
].join("; ");

export default convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    const pathname = request.nextUrl.pathname;

    const nextWithPathnameHeader = () => {
      const response = NextResponse.next();
      response.headers.set("x-pathname", pathname);
      if (isMondayPage(request)) {
        response.headers.set("Content-Security-Policy", mondayEmbedCsp);
      } else {
        response.headers.set("X-Frame-Options", "DENY");
      }
      return response;
    };

    // API routes perform their own auth checks and should not be redirected.
    // Monday APIs specifically rely on verified Monday session tokens server-side.
    if (pathname.startsWith("/api/")) {
      return nextWithPathnameHeader();
    }

    const isAuthed = await convexAuth.isAuthenticated();

    if (isSignUpPage(request)) {
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      url.searchParams.set("account_creation_disabled", "1");
      return NextResponse.redirect(url);
    }

    if (isAuthPage(request) && isAuthed) {
      const url = request.nextUrl.clone();
      url.pathname = "/jobs";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // /forms is intentionally public.
    // /monday routes should only bypass Convex auth when loaded from embedded Monday context.
    const isMondayRoute = isMondayPage(request);
    const hasMondaySessionToken =
      !!request.nextUrl.searchParams.get("sessionToken")?.trim() ||
      !!request.headers.get("x-monday-session-token")?.trim();
    const hasMondayInstanceId = !!request.nextUrl.searchParams.get("instanceId")?.trim();
    const referer = request.headers.get("referer") ?? "";
    const hasMondayReferer = mondayRefererPattern.test(referer);
    const isEmbeddedMondayRequest =
      isMondayRoute &&
      (hasMondaySessionToken || hasMondayInstanceId || hasMondayReferer);

    const requiresConvexAuth =
      !isAuthPage(request) && !isFormsPage(request) && !isEmbeddedMondayRequest;

    if (requiresConvexAuth && !isAuthed) {
      const returnTo = pathname + request.nextUrl.search;
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      url.searchParams.set("return_to", returnTo);
      return NextResponse.redirect(url);
    }

    return nextWithPathnameHeader();
  },
  { cookieConfig: { maxAge: 60 * 60 * 24 * 30 } },
);

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/"],
};

