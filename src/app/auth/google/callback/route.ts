import { NextRequest, NextResponse } from "next/server";
import { appendBackendSetCookies, postBackend } from "@/lib/auth/backend";
import {
  AUTH_COOKIES,
  SIGNUP_COOKIE_OPTIONS,
  clearAuthenticatedSessionCookies,
  clearAuthStatusReasonCookie,
  clearSignupCookies,
  encodeGoogleProfile,
  setAuthStatusReasonCookie,
  setAuthenticatedSessionCookies,
} from "@/lib/auth/cookies";
import type { GoogleLoginResponse } from "@/lib/auth/types";
import type { AuthErrorCode } from "@/lib/auth/error-codes";
import { sanitizeReturnToPath } from "@/lib/auth/return-to";
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
    const adminIntent = isAdminIntent(request);
    const response = adminIntent
      ? createAdminRedirect(request, result)
      : createAuthStatusRedirect(request, result);

    response.cookies.delete(AUTH_COOKIES.oauthState);
    response.cookies.delete(AUTH_COOKIES.oauthLocale);
    response.cookies.delete(AUTH_COOKIES.oauthIntent);
    response.cookies.delete(AUTH_COOKIES.oauthReturnTo);
    if (
      adminIntent
        ? hasUsableAdminLoginResult(result)
        : result.authStatus === "ACTIVE" && result.accessToken && result.userType
    ) {
      appendBackendSetCookies(response, backend.setCookies);
    }
    return response;
  } catch {
    return redirectToLoginWithError(request, "serverUnavailable");
  }
}

function hasUsableAdminLoginResult(result: GoogleLoginResponse) {
  return Boolean(
    result.registered &&
    result.authStatus === "ACTIVE" &&
    result.accessToken &&
    result.userType === "ADMIN",
  );
}

function isAdminIntent(request: NextRequest) {
  return request.cookies.get(AUTH_COOKIES.oauthIntent)?.value === "admin";
}

function createAdminRedirect(request: NextRequest, result: GoogleLoginResponse) {
  if (!result.registered || result.authStatus === "ONBOARDING_REQUIRED") {
    return redirectToAdminLoginWithError(request, "adminAccountRequired");
  }
  if (result.authStatus !== "ACTIVE" || !result.accessToken || result.userType !== "ADMIN") {
    return redirectToAdminLoginWithError(request, "adminOnly");
  }

  const response = NextResponse.redirect(createPublicUrl(request, "/admin/users"));
  setAuthenticatedSessionCookies(response, result);
  clearSignupCookies(response);
  clearAuthStatusReasonCookie(response);
  return response;
}

function createAuthStatusRedirect(request: NextRequest, result: GoogleLoginResponse) {
  switch (result.authStatus) {
    case "ACTIVE":
      return createAuthenticatedRedirect(request, result);
    case "ONBOARDING_REQUIRED":
      return createOnboardingRedirect(request, result);
    case "PENDING_APPROVAL":
    case "REJECTED":
    case "SUSPENDED":
      return createInactiveAccountRedirect(request, result);
    default:
      return redirectToLoginWithError(request, "invalidLoginResponse");
  }
}

function createAuthenticatedRedirect(request: NextRequest, result: GoogleLoginResponse) {
  if (!result.accessToken || !result.userType) {
    return redirectToLoginWithError(request, "invalidLoginResponse");
  }

  // 로그인 전에 보던 화면이 있으면 그 화면으로 복귀한다 (검증된 내부 경로만)
  const returnTo = sanitizeReturnToPath(request.cookies.get(AUTH_COOKIES.oauthReturnTo)?.value);
  const fallbackPath = result.userType === "BUDDY" ? "/dashboard" : "/";
  const response = NextResponse.redirect(createLocalizedUrl(request, returnTo ?? fallbackPath));
  setAuthenticatedSessionCookies(response, result);
  clearSignupCookies(response);
  clearAuthStatusReasonCookie(response);
  return response;
}

function createOnboardingRedirect(request: NextRequest, result: GoogleLoginResponse) {
  if (result.registered || !result.signupToken) {
    return redirectToLoginWithError(request, "missingSignupToken");
  }

  const onboardingPath =
    request.cookies.get(AUTH_COOKIES.oauthIntent)?.value === "buddy"
      ? "/buddy/onboarding"
      : "/onboarding";
  const response = NextResponse.redirect(createLocalizedUrl(request, onboardingPath));
  clearAuthenticatedSessionCookies(response);
  clearAuthStatusReasonCookie(response);
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

function createInactiveAccountRedirect(request: NextRequest, result: GoogleLoginResponse) {
  if (!result.registered || !result.userType) {
    return redirectToLoginWithError(request, "invalidLoginResponse");
  }

  const statusUrl = createLocalizedUrl(request, "/buddy/auth/status");
  statusUrl.searchParams.set("status", result.authStatus);
  const response = NextResponse.redirect(statusUrl);
  clearAuthenticatedSessionCookies(response);
  clearSignupCookies(response);
  setAuthStatusReasonCookie(response, result.statusReason);
  return response;
}

function redirectToLoginWithError(request: NextRequest, code: AuthErrorCode) {
  if (isAdminIntent(request)) return redirectToAdminLoginWithError(request, code);
  const loginUrl = createLocalizedUrl(request, "/login");
  loginUrl.searchParams.set("error", code);

  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(AUTH_COOKIES.oauthState);
  response.cookies.delete(AUTH_COOKIES.oauthLocale);
  response.cookies.delete(AUTH_COOKIES.oauthIntent);
  return response;
}

function redirectToAdminLoginWithError(request: NextRequest, code: string) {
  const loginUrl = createPublicUrl(request, "/admin/login");
  loginUrl.searchParams.set("error", code);
  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(AUTH_COOKIES.oauthState);
  response.cookies.delete(AUTH_COOKIES.oauthLocale);
  response.cookies.delete(AUTH_COOKIES.oauthIntent);
  clearSignupCookies(response);
  return response;
}

function createLocalizedUrl(request: NextRequest, pathname: string) {
  const locale = getLocaleOrDefault(
    request.cookies.get(AUTH_COOKIES.oauthLocale)?.value ??
      request.cookies.get(LOCALE_COOKIE_NAME)?.value,
  );
  return createPublicUrl(request, localizePathname(pathname, locale));
}

function createPublicUrl(request: NextRequest, pathname: string) {
  const configuredRedirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();

  if (configuredRedirectUri) {
    try {
      return new URL(pathname, new URL(configuredRedirectUri).origin);
    } catch {
      // 잘못된 로컬 설정에서는 기존 요청 URL을 사용해 오류 화면으로 이동한다.
    }
  }

  return new URL(pathname, request.url);
}
