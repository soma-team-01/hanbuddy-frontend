import { NextRequest, NextResponse } from "next/server";
import {
  appendBackendSetCookies,
  createProxyErrorResponse,
  getBackend,
  patchBackend,
} from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import type { MyProfile, MyProfileUpdateRequest } from "@/types/user";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get(AUTH_COOKIES.accessToken)?.value;

  if (!accessToken) {
    return NextResponse.json(createProxyErrorResponse("로그인이 필요합니다."), { status: 401 });
  }

  try {
    const backend = await getBackend<MyProfile>("/users/me", { bearerToken: accessToken });
    const response = NextResponse.json(backend.payload, { status: backend.status });
    appendBackendSetCookies(response, backend.setCookies);
    return response;
  } catch {
    return NextResponse.json(createProxyErrorResponse("인증 서버에 연결할 수 없습니다."), {
      status: 502,
    });
  }
}

export async function PATCH(request: NextRequest) {
  const accessToken = request.cookies.get(AUTH_COOKIES.accessToken)?.value;

  if (!accessToken) {
    return NextResponse.json(createProxyErrorResponse("로그인이 필요합니다."), { status: 401 });
  }

  let body: MyProfileUpdateRequest;
  try {
    body = (await request.json()) as MyProfileUpdateRequest;
  } catch {
    return NextResponse.json(createProxyErrorResponse("프로필 수정 요청을 읽을 수 없습니다."), {
      status: 400,
    });
  }

  try {
    const backend = await patchBackend<MyProfileUpdateRequest, MyProfile>("/users/me", body, {
      bearerToken: accessToken,
    });
    const response = NextResponse.json(backend.payload, { status: backend.status });
    appendBackendSetCookies(response, backend.setCookies);
    return response;
  } catch {
    return NextResponse.json(createProxyErrorResponse("인증 서버에 연결할 수 없습니다."), {
      status: 502,
    });
  }
}
