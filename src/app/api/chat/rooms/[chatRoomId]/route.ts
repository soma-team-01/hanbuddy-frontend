import { NextRequest } from "next/server";
import {
  badRequestResponse,
  proxyAuthenticatedGet,
  proxyAuthenticatedPatch,
  readJsonBody,
} from "@/app/api/_utils/authenticated-backend";
import { isValidChatRoomId, normalizeChatRoomTitle } from "@/app/api/_utils/chat-input";
import type { ChatRoomDetailResponse, UpdateChatRoomTitleRequest } from "@/types/chat";

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

export async function PATCH(request: NextRequest, context: ChatRoomRouteContext) {
  const { chatRoomId } = await context.params;
  if (!isValidChatRoomId(chatRoomId)) {
    return badRequestResponse("잘못된 채팅방 ID입니다.");
  }

  const parsed = await readJsonBody<UpdateChatRoomTitleRequest>(request, "잘못된 요청 형식입니다.");
  if (!parsed.ok) return parsed.response;

  const title = normalizeChatRoomTitle(parsed.body?.title);
  if (title === undefined) {
    return badRequestResponse("채팅방 이름은 50자 이하여야 합니다.");
  }

  return proxyAuthenticatedPatch<UpdateChatRoomTitleRequest, ChatRoomDetailResponse>(
    request,
    `/chat/rooms/${chatRoomId}`,
    { title },
    "채팅 서버에 연결할 수 없습니다.",
  );
}
