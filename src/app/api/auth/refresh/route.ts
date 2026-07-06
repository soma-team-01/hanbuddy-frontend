import { NextRequest, NextResponse } from "next/server";
import { appendBackendSetCookies, createProxyErrorResponse, postBackend } from "@/lib/auth/backend";
import { setAuthenticatedSessionCookies } from "@/lib/auth/cookies";
import type { AccessTokenResponse } from "@/lib/auth/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const backend = await postBackend<undefined, AccessTokenResponse>("/auth/refresh", undefined, {
      cookieHeader: request.headers.get("cookie"),
    });
    const response = NextResponse.json(backend.payload, { status: backend.status });
    appendBackendSetCookies(response, backend.setCookies);

    if (backend.payload.isSuccess) {
      setAuthenticatedSessionCookies(response, { accessToken: backend.payload.result.accessToken });
    }

    return response;
  } catch {
    return NextResponse.json(createProxyErrorResponse("인증 서버에 연결할 수 없습니다."), {
      status: 502,
    });
  }
}
