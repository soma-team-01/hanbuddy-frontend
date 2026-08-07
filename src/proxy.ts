import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import {
  getLocaleFromLocation,
  getLocaleFromPathname,
  hasUnsupportedLanguageSegment,
  localizePathname,
  stripLocaleFromPathname,
} from "@/i18n/pathname";
import { routing } from "@/i18n/routing";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { getRouteAccessRedirect, parseUserType } from "@/lib/auth/routes";

const handleI18nRouting = createMiddleware(routing);

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return handleAdminRoute(request);
  }
  if (hasUnsupportedLanguageSegment(pathname)) return NextResponse.next();

  const intlResponse = handleI18nRouting(request);
  const locale =
    getLocaleFromPathname(pathname) ??
    getLocaleFromLocation(intlResponse.headers.get("location")) ??
    routing.defaultLocale;
  const redirectPath = getRouteAccessRedirect({
    pathname: stripLocaleFromPathname(pathname),
    accessToken: request.cookies.get(AUTH_COOKIES.accessToken)?.value,
    signupToken: request.cookies.get(AUTH_COOKIES.signupToken)?.value,
    userType: parseUserType(request.cookies.get(AUTH_COOKIES.userType)?.value),
  });

  if (redirectPath) {
    return NextResponse.redirect(new URL(localizePathname(redirectPath, locale), request.url));
  }

  return intlResponse;
}

function handleAdminRoute(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const accessToken = request.cookies.get(AUTH_COOKIES.accessToken)?.value;
  const userType = parseUserType(request.cookies.get(AUTH_COOKIES.userType)?.value);
  const authenticatedAdmin = Boolean(accessToken && userType === "ADMIN");

  if (pathname === "/admin/login") {
    return authenticatedAdmin
      ? NextResponse.redirect(new URL("/admin/buddies", request.url))
      : NextResponse.next();
  }
  if (!accessToken) return NextResponse.redirect(new URL("/admin/login", request.url));
  if (userType !== "ADMIN") {
    return NextResponse.redirect(new URL("/admin/login?error=adminOnly", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/((?!api|auth/google/callback|_next|_vercel|.*[.].*).*)",
};
