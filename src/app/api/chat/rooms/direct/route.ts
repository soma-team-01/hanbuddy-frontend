import { NextRequest } from "next/server";
import {
  badRequestResponse,
  proxyAuthenticatedPost,
  readJsonBody,
} from "@/app/api/_utils/authenticated-backend";
import { isPositiveId } from "@/app/api/_utils/chat-input";
import type { ChatRoomDetailResponse, CreateDirectChatRoomRequest } from "@/types/chat";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const parsed = await readJsonBody<CreateDirectChatRoomRequest>(
    request,
    "잘못된 요청 형식입니다.",
  );
  if (!parsed.ok) return parsed.response;

  if (!isPositiveId(parsed.body?.targetUserId)) {
    return badRequestResponse("대화 상대가 올바르지 않습니다.");
  }

  return proxyAuthenticatedPost<CreateDirectChatRoomRequest, ChatRoomDetailResponse>(
    request,
    "/chat/rooms/direct",
    { targetUserId: parsed.body.targetUserId },
    "채팅 서버에 연결할 수 없습니다.",
  );
}
