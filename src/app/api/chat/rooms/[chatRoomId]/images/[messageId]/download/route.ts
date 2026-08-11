import { NextRequest, NextResponse } from "next/server";
import {
  backendUnavailableResponse,
  badRequestResponse,
  getAccessToken,
  unauthorizedResponse,
} from "@/app/api/_utils/authenticated-backend";
import { isValidChatRoomId } from "@/app/api/_utils/chat-input";
import { getBackendApiBaseUrl } from "@/lib/auth/backend";

export const dynamic = "force-dynamic";

const UNAVAILABLE_MESSAGE = "사진을 내려받지 못했습니다.";

interface ChatImageDownloadRouteContext {
  params: Promise<{ chatRoomId: string; messageId: string }>;
}

/**
 * 저장용 임시 URL로 이어주는 다운로드 경로.
 * 백엔드가 302로 돌려주므로 따라가지 않고 브라우저에 그대로 넘긴다.
 */
export async function GET(request: NextRequest, context: ChatImageDownloadRouteContext) {
  const { chatRoomId, messageId } = await context.params;
  if (!isValidChatRoomId(chatRoomId) || !isValidChatRoomId(messageId)) {
    return badRequestResponse("잘못된 사진 요청입니다.");
  }

  const accessToken = getAccessToken(request);
  if (!accessToken) return unauthorizedResponse();

  try {
    const backendResponse = await fetch(
      `${getBackendApiBaseUrl()}/chat/rooms/${chatRoomId}/images/${messageId}/download`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
      },
    );

    const location = backendResponse.headers.get("location");
    if (location) return NextResponse.redirect(location, 302);

    // 302가 아니면 백엔드가 내려준 오류 본문을 그대로 전달한다
    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      headers: {
        "Content-Type": backendResponse.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error(UNAVAILABLE_MESSAGE, error);
    return backendUnavailableResponse(UNAVAILABLE_MESSAGE);
  }
}
