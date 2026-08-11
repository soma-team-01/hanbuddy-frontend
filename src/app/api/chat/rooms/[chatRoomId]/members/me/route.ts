import { NextRequest } from "next/server";
import {
  badRequestResponse,
  proxyAuthenticatedDelete,
} from "@/app/api/_utils/authenticated-backend";
import { isValidChatRoomId } from "@/app/api/_utils/chat-input";

export const dynamic = "force-dynamic";

interface ChatMemberRouteContext {
  params: Promise<{ chatRoomId: string }>;
}

export async function DELETE(request: NextRequest, context: ChatMemberRouteContext) {
  const { chatRoomId } = await context.params;
  if (!isValidChatRoomId(chatRoomId)) {
    return badRequestResponse("잘못된 채팅방 ID입니다.");
  }

  return proxyAuthenticatedDelete<null>(
    request,
    `/chat/rooms/${chatRoomId}/members/me`,
    "채팅 서버에 연결할 수 없습니다.",
  );
}
