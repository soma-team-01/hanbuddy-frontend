import { type NextRequest, NextResponse } from "next/server";
import { localizePathname } from "@/i18n/pathname";
import { getLocaleOrDefault, LOCALE_COOKIE_NAME } from "@/i18n/routing";
import { AUTH_COOKIES, OAUTH_STATE_COOKIE_OPTIONS } from "@/lib/auth/cookies";
import type { AuthErrorCode } from "@/lib/auth/error-codes";
import { buildGoogleAuthorizationUrl, createOAuthState } from "@/lib/auth/google";

export const dynamic = "force-dynamic";

class GoogleAuthStartConfigError extends Error {}

export function GET(request: NextRequest) {
  try {
    const locale = getLocaleOrDefault(
      request.nextUrl.searchParams.get("locale") ?? request.cookies.get(LOCALE_COOKIE_NAME)?.value,
    );
    const intent = request.nextUrl.searchParams.get("intent") === "buddy" ? "buddy" : undefined;
    const state = createOAuthState();
    const authorizationUrl = buildGoogleAuthorizationUrl({
      clientId: getGoogleClientId(),
      redirectUri: getGoogleRedirectUri(),
      state,
    });

    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(AUTH_COOKIES.oauthState, state, OAUTH_STATE_COOKIE_OPTIONS);
    response.cookies.set(AUTH_COOKIES.oauthLocale, locale, OAUTH_STATE_COOKIE_OPTIONS);
    if (intent) {
      response.cookies.set(AUTH_COOKIES.oauthIntent, intent, OAUTH_STATE_COOKIE_OPTIONS);
    } else {
      response.cookies.delete(AUTH_COOKIES.oauthIntent);
    }
    return response;
  } catch (error) {
    return redirectToLoginWithError(
      request,
      error instanceof GoogleAuthStartConfigError ? "configuration" : "unknown",
    );
  }
}

function redirectToLoginWithError(request: NextRequest, code: AuthErrorCode) {
  const locale = getLocaleOrDefault(
    request.nextUrl.searchParams.get("locale") ?? request.cookies.get(LOCALE_COOKIE_NAME)?.value,
  );
  const loginUrl = new URL(localizePathname("/login", locale), request.url);
  loginUrl.searchParams.set("error", code);
  return NextResponse.redirect(loginUrl);
}

function getGoogleClientId() {
  const value = process.env.GOOGLE_CLIENT_ID;
  if (!value?.trim()) {
    throw new GoogleAuthStartConfigError("Missing required environment variable: GOOGLE_CLIENT_ID");
  }
  return value.trim();
}

function getGoogleRedirectUri() {
  const value = process.env.GOOGLE_REDIRECT_URI;
  if (!value?.trim()) {
    throw new GoogleAuthStartConfigError(
      "Missing required environment variable: GOOGLE_REDIRECT_URI",
    );
  }
  return value.trim();
}
