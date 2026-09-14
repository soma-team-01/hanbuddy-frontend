import { NextRequest, NextResponse } from "next/server";
import {
  appendBackendSetCookies,
  createProxyErrorResponse,
  patchBackend,
} from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import type { MarketingConsentRequest, MyAgreement } from "@/types/agreement";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  const accessToken = request.cookies.get(AUTH_COOKIES.accessToken)?.value;
  if (!accessToken)
    return NextResponse.json(createProxyErrorResponse("로그인이 필요합니다."), { status: 401 });
  let body: MarketingConsentRequest;
  try {
    const input: unknown = await request.json();
    if (
      !input ||
      typeof input !== "object" ||
      !("agreed" in input) ||
      typeof input.agreed !== "boolean"
    ) {
      throw new Error("Invalid decision");
    }
    if (input.agreed) {
      if (!("version" in input) || typeof input.version !== "string" || !input.version.trim())
        throw new Error("Missing version");
      body = { agreed: true, version: input.version };
    } else {
      body = { agreed: false };
    }
  } catch {
    return NextResponse.json(
      createProxyErrorResponse("마케팅 수신 설정 요청을 읽을 수 없습니다."),
      { status: 400 },
    );
  }
  try {
    const backend = await patchBackend<MarketingConsentRequest, MyAgreement>(
      "/users/me/marketing-consent",
      body,
      { bearerToken: accessToken },
    );
    const response = NextResponse.json(backend.payload, { status: backend.status });
    appendBackendSetCookies(response, backend.setCookies);
    return response;
  } catch {
    return NextResponse.json(createProxyErrorResponse("인증 서버에 연결할 수 없습니다."), {
      status: 502,
    });
  }
}
