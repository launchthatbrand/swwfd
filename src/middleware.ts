import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
} from "@convex-dev/auth/nextjs/server";
import { NextResponse } from "next/server";

const isAuthPage = createRouteMatcher(["/sign-in", "/sign-up"]);
const isFormsPage = createRouteMatcher(["/forms(.*)"]);
const isMondayPage = createRouteMatcher(["/monday(.*)"]);
const mondayRefererPattern = /^https?:\/\/([^.]+\.)?monday\.com(\/|$)/i;

export default convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    const pathname = request.nextUrl.pathname;

    const nextWithPathnameHeader = () => {
      const response = NextResponse.next();
      response.headers.set("x-pathname", pathname);
      return response;
    };

    // API routes perform their own auth checks and should not be redirected.
    // Monday APIs specifically rely on verified Monday session tokens server-side.
    if (pathname.startsWith("/api/")) {
      return nextWithPathnameHeader();
    }

    const isAuthed = await convexAuth.isAuthenticated();

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
    const isIframeRequest = request.headers.get("sec-fetch-dest") === "iframe";
    const referer = request.headers.get("referer") ?? "";
    const hasMondayReferer = mondayRefererPattern.test(referer);
    const isEmbeddedMondayRequest =
      isMondayRoute && (hasMondaySessionToken || (isIframeRequest && hasMondayReferer));

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

