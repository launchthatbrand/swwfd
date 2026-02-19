import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
} from "@convex-dev/auth/nextjs/server";
import { NextResponse } from "next/server";

const isAuthPage = createRouteMatcher(["/sign-in", "/sign-up"]);
const isProtectedApplyRoute = createRouteMatcher(["/jobs/:jobId/apply(.*)"]);

export default convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    const isAuthed = await convexAuth.isAuthenticated();

    if (isAuthPage(request) && isAuthed) {
      const url = request.nextUrl.clone();
      url.pathname = "/jobs";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (isProtectedApplyRoute(request) && !isAuthed) {
      const returnTo = request.nextUrl.pathname + request.nextUrl.search;
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      url.searchParams.set("return_to", returnTo);
      return NextResponse.redirect(url);
    }
  },
  { cookieConfig: { maxAge: 60 * 60 * 24 * 30 } },
);

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};

