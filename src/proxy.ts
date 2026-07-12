import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { getRouteAccessRedirect, parseUserType } from "@/lib/auth/routes";

export function proxy(request: NextRequest) {
  const redirectPath = getRouteAccessRedirect({
    pathname: request.nextUrl.pathname,
    accessToken: request.cookies.get(AUTH_COOKIES.accessToken)?.value,
    signupToken: request.cookies.get(AUTH_COOKIES.signupToken)?.value,
    userType: parseUserType(request.cookies.get(AUTH_COOKIES.userType)?.value),
  });

  if (redirectPath) {
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/onboarding",
    "/home/:path*",
    "/explore/:path*",
    "/activities/:path*",
    "/applications/:path*",
    "/dashboard/:path*",
    "/my-activities/:path*",
    "/my-page/:path*",
  ],
};
