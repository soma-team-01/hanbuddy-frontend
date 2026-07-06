import { NextResponse } from "next/server";
import { createProxyErrorResponse } from "@/lib/auth/backend";
import { AUTH_COOKIES, OAUTH_STATE_COOKIE_OPTIONS } from "@/lib/auth/cookies";
import { buildGoogleAuthorizationUrl, createOAuthState } from "@/lib/auth/google";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    const state = createOAuthState();
    const authorizationUrl = buildGoogleAuthorizationUrl({
      clientId: getGoogleClientId(),
      redirectUri: getGoogleRedirectUri(),
      state,
    });

    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(AUTH_COOKIES.oauthState, state, OAUTH_STATE_COOKIE_OPTIONS);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google 로그인을 시작할 수 없습니다.";
    return NextResponse.json(createProxyErrorResponse(message), { status: 500 });
  }
}

function getGoogleClientId() {
  const value = process.env.GOOGLE_CLIENT_ID;
  if (!value?.trim()) {
    throw new Error("Missing required environment variable: GOOGLE_CLIENT_ID");
  }
  return value.trim();
}

function getGoogleRedirectUri() {
  const value = process.env.GOOGLE_REDIRECT_URI;
  if (!value?.trim()) {
    throw new Error("Missing required environment variable: GOOGLE_REDIRECT_URI");
  }
  return value.trim();
}
