import { NextRequest } from "next/server";
import {
  badRequestResponse,
  proxyAuthenticatedGet,
  proxyAuthenticatedPost,
  readJsonBody,
} from "@/app/api/_utils/authenticated-backend";
import {
  buildChatMessageQuery,
  isValidChatBatchId,
  isValidChatImageKey,
  isValidChatMessageContent,
  isValidChatRoomId,
} from "@/app/api/_utils/chat-input";
import { appendRequestedContentLanguage } from "@/app/api/_utils/content-language";
import type {
  ChatMessagePageResponse,
  ChatMessageResponse,
  SendChatMessageRequest,
} from "@/types/chat";
import { isContentLanguage } from "@/types/content-language";

export const dynamic = "force-dynamic";

interface ChatMessagesRouteContext {
  params: Promise<{ chatRoomId: string }>;
}

export async function GET(request: NextRequest, context: ChatMessagesRouteContext) {
  const { chatRoomId } = await context.params;
  if (!isValidChatRoomId(chatRoomId)) {
    return badRequestResponse("잘못된 채팅방 ID입니다.");
  }

  const backendPath = `/chat/rooms/${chatRoomId}/messages${buildChatMessageQuery(request.nextUrl.searchParams)}`;
  return proxyAuthenticatedGet<ChatMessagePageResponse>(
    request,
    appendRequestedContentLanguage(request, backendPath),
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

  const body = parsed.body;
  if (!isContentLanguage(body?.sourceLanguage)) {
    return badRequestResponse("메시지 언어가 올바르지 않습니다.");
  }
  // 모르는 값을 조용히 TEXT로 처리하면 계약이 어긋난 요청이 성공한 것처럼 보인다
  const requestedType = body?.messageType;
  if (requestedType !== undefined && requestedType !== "TEXT" && requestedType !== "IMAGE") {
    return badRequestResponse("메시지 유형이 올바르지 않습니다.");
  }
  const messageType = requestedType ?? "TEXT";

  if (messageType === "IMAGE") {
    if (!isValidChatImageKey(body?.imageKey)) {
      return badRequestResponse("사진 정보가 올바르지 않습니다.");
    }
    // 캡션은 선택이지만, 넣었다면 길이 제한은 그대로 지킨다
    if (body.content != null && !isValidChatMessageContent(body.content)) {
      return badRequestResponse("메시지는 1자 이상 2000자 이하여야 합니다.");
    }

    return proxyAuthenticatedPost<SendChatMessageRequest, ChatMessageResponse>(
      request,
      `/chat/rooms/${chatRoomId}/messages`,
      {
        messageType: "IMAGE",
        sourceLanguage: body.sourceLanguage,
        imageKey: body.imageKey,
        content: body.content ?? null,
        imageWidth: toPositiveInteger(body.imageWidth),
        imageHeight: toPositiveInteger(body.imageHeight),
        batchId: isValidChatBatchId(body.batchId) ? body.batchId : undefined,
      },
      "채팅 서버에 연결할 수 없습니다.",
    );
  }

  if (!isValidChatMessageContent(body?.content)) {
    return badRequestResponse("메시지는 1자 이상 2000자 이하여야 합니다.");
  }

  return proxyAuthenticatedPost<SendChatMessageRequest, ChatMessageResponse>(
    request,
    `/chat/rooms/${chatRoomId}/messages`,
    { messageType: "TEXT", content: body.content, sourceLanguage: body.sourceLanguage },
    "채팅 서버에 연결할 수 없습니다.",
  );
}

/** 이미지 크기는 선택 값이라, 쓸 수 없는 값이면 아예 넘기지 않는다 */
function toPositiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}
