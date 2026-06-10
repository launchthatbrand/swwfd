import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
} from "@convex-dev/auth/nextjs/server";
import { NextResponse } from "next/server";

const isAuthPage = createRouteMatcher(["/sign-in", "/sign-up"]);
const isFormsPage = createRouteMatcher(["/forms(.*)"]);
const isMondayPage = createRouteMatcher(["/monday(.*)"]);

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
    // /monday app routes are embedded in Monday and use Monday context/session token auth.
    const requiresConvexAuth =
      !isAuthPage(request) && !isFormsPage(request) && !isMondayPage(request);

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

