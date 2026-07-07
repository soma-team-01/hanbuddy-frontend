import { NextRequest, NextResponse } from "next/server";
import { appendBackendSetCookies, createProxyErrorResponse, postBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import {
  isSupportedProfileImageType,
  type PresignedImageUploadRequest,
  type PresignedImageUploadResult,
} from "@/lib/images/presigned";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // 온보딩 중에는 signupToken, 로그인 후에는 accessToken을 Bearer로 사용한다
  const bearerToken =
    request.cookies.get(AUTH_COOKIES.signupToken)?.value ??
    request.cookies.get(AUTH_COOKIES.accessToken)?.value;

  if (!bearerToken) {
    return NextResponse.json(createProxyErrorResponse("이미지 업로드 인증 정보가 없습니다."), {
      status: 401,
    });
  }

  let body: PresignedImageUploadRequest;
  try {
    body = (await request.json()) as PresignedImageUploadRequest;
  } catch {
    return NextResponse.json(createProxyErrorResponse("이미지 업로드 요청을 읽을 수 없습니다."), {
      status: 400,
    });
  }

  // 백엔드가 최종 검증하지만, 프록시를 직접 호출하는 잘못된 요청은 여기서 걸러낸다
  if (
    body?.purpose !== "PROFILE" ||
    !isSupportedProfileImageType(body.contentType) ||
    body.imageCount !== 1
  ) {
    return NextResponse.json(createProxyErrorResponse("잘못된 이미지 업로드 요청입니다."), {
      status: 400,
    });
  }

  try {
    const backend = await postBackend<PresignedImageUploadRequest, PresignedImageUploadResult>(
      "/images/presigned-urls",
      body,
      { bearerToken },
    );

    const response = NextResponse.json(backend.payload, { status: backend.status });
    appendBackendSetCookies(response, backend.setCookies);
    return response;
  } catch {
    return NextResponse.json(createProxyErrorResponse("이미지 업로드 서버에 연결할 수 없습니다."), {
      status: 502,
    });
  }
}
