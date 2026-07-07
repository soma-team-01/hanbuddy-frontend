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
      callbackUrl.searchParams.get("error_description") ?? error,
    );
  }

  if (!code) {
    return redirectToLoginWithError(request, "Google 인증 코드가 없습니다.");
  }

  if (!state || !expectedState || state !== expectedState) {
    return redirectToLoginWithError(request, "Google 로그인 상태 검증에 실패했습니다.");
  }

  try {
    const backend = await postBackend<{ code: string }, GoogleLoginResponse>("/auth/google/login", {
      code,
    });

    if (!backend.payload.isSuccess) {
      return redirectToLoginWithError(request, backend.payload.message);
    }

    const result = backend.payload.result;
    const response = result.registered
      ? createAuthenticatedRedirect(request, result)
      : createOnboardingRedirect(request, result);

    response.cookies.delete(AUTH_COOKIES.oauthState);
    if (hasUsableGoogleLoginResult(result)) {
      appendBackendSetCookies(response, backend.setCookies);
    }
    return response;
  } catch {
    return redirectToLoginWithError(request, "인증 서버에 연결할 수 없습니다.");
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
    return redirectToLoginWithError(request, "로그인 응답에 필요한 사용자 정보가 없습니다.");
  }

  const response = NextResponse.redirect(
    new URL(result.userType === "BUDDY" ? "/dashboard" : "/explore", request.url),
  );
  setAuthenticatedSessionCookies(response, result);
  clearSignupCookies(response);
  return response;
}

function createOnboardingRedirect(request: NextRequest, result: GoogleLoginResponse) {
  if (!result.signupToken) {
    return redirectToLoginWithError(request, "회원가입 토큰을 받을 수 없습니다.");
  }

  const response = NextResponse.redirect(new URL("/onboarding", request.url));
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

function redirectToLoginWithError(request: NextRequest, message: string) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", message);

  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(AUTH_COOKIES.oauthState);
  return response;
}
