import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import {
  getLocaleFromPathname,
  hasUnsupportedLanguageSegment,
  localizePathname,
  stripLocaleFromPathname,
} from "@/i18n/pathname";
import { isLocale, LOCALE_COOKIE_NAME, routing } from "@/i18n/routing";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { sanitizeReturnToPath } from "@/lib/auth/return-to";
import { getRouteAccessRedirect, parseUserType } from "@/lib/auth/routes";
import { resolveLegacyLandingPath } from "@/lib/legacy-landing";

import { isNoindexPath } from "@/lib/seo/indexing";

const handleI18nRouting = createMiddleware(routing);

export function proxy(request: NextRequest) {
  if (stripLocaleFromPathname(request.nextUrl.pathname) === "/auth/reset-password") {
    // Keep fragment credentials in a document without third-party analytics. No locale redirect.
    const resetHeaders = new Headers(request.headers);
    resetHeaders.set(
      "x-reset-locale",
      getLocaleFromPathname(request.nextUrl.pathname) ??
        (isLocale(request.cookies.get(LOCALE_COOKIE_NAME)?.value)
          ? request.cookies.get(LOCALE_COOKIE_NAME)!.value
          : routing.defaultLocale),
    );
    const response =
      request.nextUrl.pathname === "/auth/reset-password"
        ? NextResponse.next({ request: { headers: resetHeaders } })
        : NextResponse.rewrite(new URL("/auth/reset-password", request.url), {
            request: { headers: resetHeaders },
          });
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }
  const response = routeRequest(request);
  if (
    isNoindexPath(request.nextUrl.pathname) ||
    (response.status >= 300 && response.status < 400)
  ) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

function routeRequest(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return handleAdminRoute(request);
  }
  if (hasUnsupportedLanguageSegment(pathname)) return NextResponse.next();

  const pathnameLocale = getLocaleFromPathname(pathname);
  const pathnameWithoutLocale = stripLocaleFromPathname(pathname);
  const userType = parseUserType(request.cookies.get(AUTH_COOKIES.userType)?.value);
  const accessToken = request.cookies.get(AUTH_COOKIES.accessToken)?.value;
  const isBuddy = userType === "BUDDY";
  const isBuddyEntry = isBuddyEntryPath(pathnameWithoutLocale);
  const savedLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  // 언어 쿠키는 브라우저 전체가 공유하므로, 주소에 적힌 언어를 먼저 따라야 탭마다 언어가 유지된다.
  // 저장된 언어는 언어 없이 들어온 주소(/explore 등)에만 쓴다.
  const locale =
    isBuddy || isBuddyEntry
      ? "ko"
      : (pathnameLocale ?? (isLocale(savedLocale) ? savedLocale : routing.defaultLocale));
  // 옛 정적 랜딩 링크(/apply?event=…, /events/…)는 로그인 여부와 무관하게 회차 상세나 홈으로 보낸다
  const legacyTarget = resolveLegacyLandingPath(
    pathnameWithoutLocale,
    request.nextUrl.searchParams,
  );
  if (legacyTarget) {
    const redirectUrl = new URL(localizePathname(legacyTarget.pathname, locale), request.url);
    redirectUrl.search = legacyTarget.search;
    return NextResponse.redirect(redirectUrl);
  }

  const redirectPath = getRouteAccessRedirect({
    pathname: pathnameWithoutLocale,
    accessToken,
    signupToken: request.cookies.get(AUTH_COOKIES.signupToken)?.value,
    resubmissionToken: request.cookies.get(AUTH_COOKIES.resubmissionToken)?.value,
    userType,
  });

  if (redirectPath) {
    const redirectUrl = new URL(localizePathname(redirectPath, locale), request.url);
    // 로그인 후 원래 가려던 화면으로 돌아올 수 있도록 목적지를 넘긴다
    if (redirectPath === "/login") {
      const returnTo = sanitizeReturnToPath(`${pathnameWithoutLocale}${request.nextUrl.search}`);
      if (returnTo) redirectUrl.searchParams.set("next", returnTo);
    }
    return NextResponse.redirect(redirectUrl);
  }

  if (pathnameLocale && pathnameLocale !== locale) {
    const redirectUrl = new URL(localizePathname(pathnameWithoutLocale, locale), request.url);
    redirectUrl.search = request.nextUrl.search;
    return NextResponse.redirect(redirectUrl);
  }

  if (pathnameLocale) {
    const response = handleI18nRouting(request);
    // 한국어 전용 버디 화면을 둘러본 것만으로 관광객이 고른 언어를 ko로 덮어쓰지 않는다
    return isBuddyEntry && !isBuddy ? withoutLocaleCookie(response) : response;
  }

  const redirectUrl = new URL(localizePathname(pathname, locale), request.url);
  redirectUrl.search = request.nextUrl.search;
  return NextResponse.redirect(redirectUrl);
}

function isBuddyEntryPath(pathname: string) {
  return pathname === "/buddy" || pathname.startsWith("/buddy/");
}

function withoutLocaleCookie(response: NextResponse) {
  const setCookies = response.headers.getSetCookie();
  const kept = setCookies.filter((cookie) => !cookie.startsWith(`${LOCALE_COOKIE_NAME}=`));
  if (kept.length === setCookies.length) return response;

  response.headers.delete("set-cookie");
  for (const cookie of kept) response.headers.append("set-cookie", cookie);
  // 렌더링 쪽에 전달되는 같은 쿠키 복사본도 함께 지운다
  if (kept.length === 0) response.headers.delete("x-middleware-set-cookie");
  return response;
}

function handleAdminRoute(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const accessToken = request.cookies.get(AUTH_COOKIES.accessToken)?.value;
  const userType = parseUserType(request.cookies.get(AUTH_COOKIES.userType)?.value);
  const authenticatedAdmin = Boolean(accessToken && userType === "ADMIN");

  if (pathname === "/admin/login") {
    return authenticatedAdmin
      ? NextResponse.redirect(new URL("/admin/users", request.url))
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
