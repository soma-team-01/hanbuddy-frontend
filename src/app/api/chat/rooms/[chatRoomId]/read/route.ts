import { NextRequest } from "next/server";
import {
  badRequestResponse,
  proxyAuthenticatedPatch,
  readJsonBody,
} from "@/app/api/_utils/authenticated-backend";
import { isPositiveId, isValidChatRoomId } from "@/app/api/_utils/chat-input";
import type { UpdateChatReadRequest } from "@/types/chat";

export const dynamic = "force-dynamic";

interface ChatReadRouteContext {
  params: Promise<{ chatRoomId: string }>;
}

export async function PATCH(request: NextRequest, context: ChatReadRouteContext) {
  const { chatRoomId } = await context.params;
  if (!isValidChatRoomId(chatRoomId)) {
    return badRequestResponse("잘못된 채팅방 ID입니다.");
  }

  const parsed = await readJsonBody<UpdateChatReadRequest>(request, "잘못된 요청 형식입니다.");
  if (!parsed.ok) return parsed.response;

  if (!isPositiveId(parsed.body?.lastReadMessageId)) {
    return badRequestResponse("읽음 위치가 올바르지 않습니다.");
  }

  return proxyAuthenticatedPatch<UpdateChatReadRequest, null>(
    request,
    `/chat/rooms/${chatRoomId}/read`,
    { lastReadMessageId: parsed.body.lastReadMessageId },
    "채팅 서버에 연결할 수 없습니다.",
  );
}
