import type { NextResponse } from "next/server";
import type { GoogleLoginResponse, GoogleProfile } from "./types";

export const AUTH_COOKIES = {
  oauthState: "hanbuddy_oauth_state",
  oauthLocale: "hanbuddy_oauth_locale",
  oauthIntent: "hanbuddy_oauth_intent",
  oauthReturnTo: "hanbuddy_oauth_return_to",
  accessToken: "hanbuddy_access_token",
  refreshToken: "refresh_token",
  signupToken: "hanbuddy_signup_token",
  googleProfile: "hanbuddy_google_profile",
  userId: "hanbuddy_user_id",
  userType: "hanbuddy_user_type",
  statusReason: "hanbuddy_auth_status_reason",
} as const;

const isProduction = process.env.NODE_ENV === "production";

const httpOnlyCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: isProduction,
  path: "/",
};

export const OAUTH_STATE_COOKIE_OPTIONS = {
  ...httpOnlyCookieOptions,
  maxAge: 10 * 60,
};

export const SIGNUP_COOKIE_OPTIONS = {
  ...httpOnlyCookieOptions,
  maxAge: 30 * 60,
};

export const SESSION_COOKIE_OPTIONS = httpOnlyCookieOptions;

export function setAuthenticatedSessionCookies(
  response: NextResponse,
  result: Pick<GoogleLoginResponse, "accessToken" | "userId" | "userType">,
) {
  if (result.accessToken) {
    response.cookies.set(AUTH_COOKIES.accessToken, result.accessToken, SESSION_COOKIE_OPTIONS);
  }
  if (result.userId) {
    response.cookies.set(AUTH_COOKIES.userId, String(result.userId), SESSION_COOKIE_OPTIONS);
  }
  if (result.userType) {
    response.cookies.set(AUTH_COOKIES.userType, result.userType, SESSION_COOKIE_OPTIONS);
  }
}

export function clearAuthenticatedSessionCookies(response: NextResponse) {
  response.cookies.delete(AUTH_COOKIES.accessToken);
  response.cookies.delete(AUTH_COOKIES.refreshToken);
  response.cookies.delete(AUTH_COOKIES.userId);
  response.cookies.delete(AUTH_COOKIES.userType);
}

export function setAuthStatusReasonCookie(response: NextResponse, reason?: string) {
  const normalizedReason = reason?.trim();
  if (normalizedReason) {
    response.cookies.set(
      AUTH_COOKIES.statusReason,
      normalizedReason.slice(0, 500),
      SIGNUP_COOKIE_OPTIONS,
    );
    return;
  }

  response.cookies.delete(AUTH_COOKIES.statusReason);
}

export function clearAuthStatusReasonCookie(response: NextResponse) {
  response.cookies.delete(AUTH_COOKIES.statusReason);
}

export function clearSignupCookies(response: NextResponse) {
  response.cookies.delete(AUTH_COOKIES.signupToken);
  response.cookies.delete(AUTH_COOKIES.googleProfile);
}

export function encodeGoogleProfile(profile: GoogleProfile) {
  const profileForCookie = {
    name: profile.name,
    picture: profile.picture,
  } satisfies GoogleProfile;

  return Buffer.from(JSON.stringify(profileForCookie), "utf8").toString("base64url");
}

export function decodeGoogleProfile(value?: string) {
  if (!value) return undefined;

  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as GoogleProfile;
  } catch {
    return undefined;
  }
}
