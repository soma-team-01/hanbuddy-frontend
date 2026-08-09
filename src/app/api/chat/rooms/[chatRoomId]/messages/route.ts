import { NextRequest } from "next/server";
import {
  badRequestResponse,
  proxyAuthenticatedGet,
  proxyAuthenticatedPost,
  readJsonBody,
} from "@/app/api/_utils/authenticated-backend";
import {
  buildChatMessageQuery,
  isValidChatMessageContent,
  isValidChatRoomId,
} from "@/app/api/_utils/chat-input";
import type {
  ChatMessagePageResponse,
  ChatMessageResponse,
  SendChatMessageRequest,
} from "@/types/chat";

export const dynamic = "force-dynamic";

interface ChatMessagesRouteContext {
  params: Promise<{ chatRoomId: string }>;
}

export async function GET(request: NextRequest, context: ChatMessagesRouteContext) {
  const { chatRoomId } = await context.params;
  if (!isValidChatRoomId(chatRoomId)) {
    return badRequestResponse("잘못된 채팅방 ID입니다.");
  }

  return proxyAuthenticatedGet<ChatMessagePageResponse>(
    request,
    `/chat/rooms/${chatRoomId}/messages${buildChatMessageQuery(request.nextUrl.searchParams)}`,
    "채팅 서버에 연결할 수 없습니다.",
  );
}

export async function POST(request: NextRequest, context: ChatMessagesRouteContext) {
  const { chatRoomId } = await context.params;
  if (!isValidChatRoomId(chatRoomId)) {
    return badRequestResponse("잘못된 채팅방 ID입니다.");
  }

  const parsed = await readJsonBody<SendChatMessageRequest>(request, "잘못된 요청 형식입니다.");
  if (!parsed.ok) return parsed.response;

  if (!isValidChatMessageContent(parsed.body?.content)) {
    return badRequestResponse("메시지는 1자 이상 2000자 이하여야 합니다.");
  }

  return proxyAuthenticatedPost<SendChatMessageRequest, ChatMessageResponse>(
    request,
    `/chat/rooms/${chatRoomId}/messages`,
    { content: parsed.body.content },
    "채팅 서버에 연결할 수 없습니다.",
  );
}
