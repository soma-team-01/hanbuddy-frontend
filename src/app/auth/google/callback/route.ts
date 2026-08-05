import { NextRequest, NextResponse } from "next/server";
import { appendBackendSetCookies, postBackend } from "@/lib/auth/backend";
import {
  AUTH_COOKIES,
  SIGNUP_COOKIE_OPTIONS,
  clearSignupCookies,
  encodeGoogleProfile,
  setAuthenticatedSessionCookies,
} from "@/lib/auth/cookies";
import type { GoogleLoginResponse } from "@/lib/auth/types";
import type { AuthErrorCode } from "@/lib/auth/error-codes";
import { localizePathname } from "@/i18n/pathname";
import { getLocaleOrDefault, LOCALE_COOKIE_NAME } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const callbackUrl = new URL(request.url);
  const error = callbackUrl.searchParams.get("error");
  const code = callbackUrl.searchParams.get("code");
  const state = callbackUrl.searchParams.get("state");
  const expectedState = request.cookies.get(AUTH_COOKIES.oauthState)?.value;

  if (error) {
    return redirectToLoginWithError(
      request,
      error === "access_denied" ? "googleCancelled" : "unknown",
    );
  }

  if (!code) {
    return redirectToLoginWithError(request, "missingCode");
  }

  if (!state || !expectedState || state !== expectedState) {
    return redirectToLoginWithError(request, "invalidState");
  }

  try {
    const backend = await postBackend<{ code: string }, GoogleLoginResponse>("/auth/google/login", {
      code,
    });

    if (!backend.payload.isSuccess) {
      return redirectToLoginWithError(request, "backendRejected");
    }

    const result = backend.payload.result;
    const response = result.registered
      ? createAuthenticatedRedirect(request, result)
      : createOnboardingRedirect(request, result);

    response.cookies.delete(AUTH_COOKIES.oauthState);
    response.cookies.delete(AUTH_COOKIES.oauthLocale);
    response.cookies.delete(AUTH_COOKIES.oauthIntent);
    if (hasUsableGoogleLoginResult(result)) {
      appendBackendSetCookies(response, backend.setCookies);
    }
    return response;
  } catch {
    return redirectToLoginWithError(request, "serverUnavailable");
  }
}

function hasUsableGoogleLoginResult(result: GoogleLoginResponse) {
  if (result.registered) {
    return Boolean(result.accessToken && result.userType);
  }

  return Boolean(result.signupToken);
}

function createAuthenticatedRedirect(request: NextRequest, result: GoogleLoginResponse) {
  if (!result.accessToken || !result.userType) {
    return redirectToLoginWithError(request, "invalidLoginResponse");
  }

  const response = NextResponse.redirect(
    createLocalizedUrl(request, result.userType === "BUDDY" ? "/dashboard" : "/explore"),
  );
  setAuthenticatedSessionCookies(response, result);
  clearSignupCookies(response);
  return response;
}

function createOnboardingRedirect(request: NextRequest, result: GoogleLoginResponse) {
  if (!result.signupToken) {
    return redirectToLoginWithError(request, "missingSignupToken");
  }

  const onboardingPath =
    request.cookies.get(AUTH_COOKIES.oauthIntent)?.value === "buddy"
      ? "/buddy/onboarding"
      : "/onboarding";
  const response = NextResponse.redirect(createLocalizedUrl(request, onboardingPath));
  response.cookies.set(AUTH_COOKIES.signupToken, result.signupToken, SIGNUP_COOKIE_OPTIONS);
  if (result.googleProfile) {
    response.cookies.set(
      AUTH_COOKIES.googleProfile,
      encodeGoogleProfile(result.googleProfile),
      SIGNUP_COOKIE_OPTIONS,
    );
  }
  return response;
}

function redirectToLoginWithError(request: NextRequest, code: AuthErrorCode) {
  const loginUrl = createLocalizedUrl(request, "/login");
  loginUrl.searchParams.set("error", code);

  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(AUTH_COOKIES.oauthState);
  response.cookies.delete(AUTH_COOKIES.oauthLocale);
  response.cookies.delete(AUTH_COOKIES.oauthIntent);
  return response;
}

function createLocalizedUrl(request: NextRequest, pathname: string) {
  const locale = getLocaleOrDefault(
    request.cookies.get(AUTH_COOKIES.oauthLocale)?.value ??
      request.cookies.get(LOCALE_COOKIE_NAME)?.value,
  );
  return new URL(localizePathname(pathname, locale), request.url);
}
