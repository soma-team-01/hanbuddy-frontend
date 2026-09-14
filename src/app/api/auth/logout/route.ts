import { NextRequest, NextResponse } from "next/server";
import { appendBackendSetCookies, createProxyErrorResponse, postBackend } from "@/lib/auth/backend";
import {
  clearAuthenticatedSessionCookies,
  clearAuthStatusReasonCookie,
  clearResubmissionCookie,
  clearSignupCookies,
} from "@/lib/auth/cookies";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const backend = await postBackend<undefined, string>("/auth/logout", undefined, {
      cookieHeader: request.headers.get("cookie"),
    });
    const response = NextResponse.json(backend.payload, { status: backend.status });
    appendBackendSetCookies(response, backend.setCookies);
    clearAuthenticatedSessionCookies(response);
    clearAuthStatusReasonCookie(response);
    clearResubmissionCookie(response);
    clearSignupCookies(response);
    return response;
  } catch {
    const response = NextResponse.json(
      createProxyErrorResponse("인증 서버에 연결할 수 없습니다."),
      {
        status: 502,
      },
    );
    clearAuthenticatedSessionCookies(response);
    clearAuthStatusReasonCookie(response);
    clearResubmissionCookie(response);
    clearSignupCookies(response);
    return response;
  }
}
