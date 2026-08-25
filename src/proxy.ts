import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import {
  getLocaleFromPathname,
  hasUnsupportedLanguageSegment,
  localizePathname,
  stripLocaleFromPathname,
} from "@/i18n/pathname";
import { isLocale, LOCALE_COOKIE_NAME, routing, type Locale } from "@/i18n/routing";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { sanitizeReturnToPath } from "@/lib/auth/return-to";
import { getRouteAccessRedirect, parseUserType } from "@/lib/auth/routes";

const handleI18nRouting = createMiddleware(routing);

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return handleAdminRoute(request);
  }
  if (hasUnsupportedLanguageSegment(pathname)) return NextResponse.next();

  const pathnameLocale = getLocaleFromPathname(pathname);
  const userType = parseUserType(request.cookies.get(AUTH_COOKIES.userType)?.value);
  const accessToken = request.cookies.get(AUTH_COOKIES.accessToken)?.value;
  const locale =
    pathnameLocale ?? resolveUnprefixedLocale(request, pathname, accessToken, userType);
  const redirectPath = getRouteAccessRedirect({
    pathname: stripLocaleFromPathname(pathname),
    accessToken,
    signupToken: request.cookies.get(AUTH_COOKIES.signupToken)?.value,
    userType,
  });

  if (redirectPath) {
    const redirectUrl = new URL(localizePathname(redirectPath, locale), request.url);
    // 로그인 후 원래 가려던 화면으로 돌아올 수 있도록 목적지를 넘긴다
    if (redirectPath === "/login") {
      const returnTo = sanitizeReturnToPath(
        `${stripLocaleFromPathname(pathname)}${request.nextUrl.search}`,
      );
      if (returnTo) redirectUrl.searchParams.set("next", returnTo);
    }
    return NextResponse.redirect(redirectUrl);
  }

  if (pathnameLocale) return handleI18nRouting(request);

  const redirectUrl = new URL(localizePathname(pathname, locale), request.url);
  redirectUrl.search = request.nextUrl.search;
  return NextResponse.redirect(redirectUrl);
}

function resolveUnprefixedLocale(
  request: NextRequest,
  pathname: string,
  accessToken: string | undefined,
  userType: ReturnType<typeof parseUserType>,
): Locale {
  const savedLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  if (accessToken && userType && isLocale(savedLocale)) return savedLocale;
  if (userType === "BUDDY" || isBuddyEntryPath(pathname)) return "ko";
  return routing.defaultLocale;
}

function isBuddyEntryPath(pathname: string) {
  return pathname === "/buddy" || pathname.startsWith("/buddy/");
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
