import { NextRequest, NextResponse } from "next/server";
import {
  createBackendJsonResponse,
  backendUnavailableResponse,
  getAccessToken,
  unauthorizedResponse,
} from "@/app/api/_utils/authenticated-backend";
import { getBackendApiBaseUrl, postBackend } from "@/lib/auth/backend";
import type { ChatWsTicketResponse } from "@/types/chat";

export const dynamic = "force-dynamic";

const UNAVAILABLE_MESSAGE = "채팅 서버에 연결할 수 없습니다.";

/**
 * WebSocket 연결용 단기 티켓을 받아 브라우저로 넘긴다.
 * 백엔드 주소는 서버 전용 환경변수라, 브라우저가 붙을 `/ws` 주소도 여기서 함께 알려준다.
 */
export async function POST(request: NextRequest) {
  const accessToken = getAccessToken(request);
  if (!accessToken) return unauthorizedResponse();

  try {
    const backend = await postBackend<undefined, ChatWsTicketResponse>(
      "/chat/ws-ticket",
      undefined,
      { bearerToken: accessToken },
    );
    if (!backend.payload.isSuccess) return createBackendJsonResponse(backend);

    const response = NextResponse.json(
      {
        ...backend.payload,
        result: { ...backend.payload.result, socketUrl: `${getBackendApiBaseUrl()}/ws` },
      },
      { status: backend.status },
    );
    return response;
  } catch (error) {
    console.error(UNAVAILABLE_MESSAGE, error);
    return backendUnavailableResponse(UNAVAILABLE_MESSAGE);
  }
}
