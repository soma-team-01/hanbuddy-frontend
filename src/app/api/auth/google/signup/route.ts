import { NextRequest, NextResponse } from "next/server";
import { appendBackendSetCookies, createProxyErrorResponse, postBackend } from "@/lib/auth/backend";
import {
  AUTH_COOKIES,
  clearSignupCookies,
  setAuthenticatedSessionCookies,
} from "@/lib/auth/cookies";
import type { GoogleLoginResponse, GoogleSignupRequest } from "@/lib/auth/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const signupToken = request.cookies.get(AUTH_COOKIES.signupToken)?.value;

  if (!signupToken) {
    return NextResponse.json(createProxyErrorResponse("Google 회원가입 세션이 만료되었습니다."), {
      status: 401,
    });
  }

  let body: GoogleSignupRequest;
  try {
    body = (await request.json()) as GoogleSignupRequest;
  } catch {
    return NextResponse.json(createProxyErrorResponse("회원가입 요청을 읽을 수 없습니다."), {
      status: 400,
    });
  }

  try {
    const backend = await postBackend<GoogleSignupRequest, GoogleLoginResponse>(
      "/auth/google/signup",
      body,
      { bearerToken: signupToken },
    );

    const response = NextResponse.json(backend.payload, { status: backend.status });
    appendBackendSetCookies(response, backend.setCookies);

    if (backend.payload.isSuccess) {
      setAuthenticatedSessionCookies(response, backend.payload.result);
      clearSignupCookies(response);
    }

    return response;
  } catch {
    return NextResponse.json(createProxyErrorResponse("인증 서버에 연결할 수 없습니다."), {
      status: 502,
    });
  }
}
