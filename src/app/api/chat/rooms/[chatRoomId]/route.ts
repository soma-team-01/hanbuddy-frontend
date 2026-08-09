import { NextRequest } from "next/server";
import { badRequestResponse, proxyAuthenticatedGet } from "@/app/api/_utils/authenticated-backend";
import { isValidChatRoomId } from "@/app/api/_utils/chat-input";
import type { ChatRoomDetailResponse } from "@/types/chat";

export const dynamic = "force-dynamic";

interface ChatRoomRouteContext {
  params: Promise<{ chatRoomId: string }>;
}

export async function GET(request: NextRequest, context: ChatRoomRouteContext) {
  const { chatRoomId } = await context.params;
  if (!isValidChatRoomId(chatRoomId)) {
    return badRequestResponse("잘못된 채팅방 ID입니다.");
  }

  return proxyAuthenticatedGet<ChatRoomDetailResponse>(
    request,
    `/chat/rooms/${chatRoomId}`,
    "채팅 서버에 연결할 수 없습니다.",
  );
}
