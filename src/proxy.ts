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

export const config = {
  matcher: "/((?!api|auth/google/callback|_next|_vercel|.*\\..*).*)",
};
