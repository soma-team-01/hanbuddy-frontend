import type {
  ChatMessagePageResponse,
  ChatRoomImagePageResponse,
  ChatWsTicketResponse,
  ChatMessageResponse,
  ChatRoomDetailResponse,
  ChatRoomSummaryResponse,
  CreateDirectChatRoomRequest,
  CreateGroupChatRoomRequest,
  SendChatMessageRequest,
  UpdateChatReadRequest,
  UpdateChatRoomTitleRequest,
} from "@/types/chat";
import { withContentLanguage } from "@/lib/content-language";
import type { ContentLanguage } from "@/types/content-language";
import { requestApiResult, type ApiResult } from "./result";

export type ChatRoomsResult = ApiResult<ChatRoomSummaryResponse[], "rooms">;
export type ChatRoomResult = ApiResult<ChatRoomDetailResponse, "room">;
export type ChatMessagesResult = ApiResult<ChatMessagePageResponse, "messages">;
export type ChatMessageResult = ApiResult<ChatMessageResponse, "message">;
export type ChatVoidResult = ApiResult<null, "chat">;
export type ChatWsTicketResult = ApiResult<ChatWsTicketResponse, "ticket">;
export type ChatRoomImagesResult = ApiResult<ChatRoomImagePageResponse, "images">;

const DEFAULT_ROOM_LIST_ERROR_MESSAGE = "채팅 목록을 불러오지 못했습니다.";
const DEFAULT_ROOM_ERROR_MESSAGE = "채팅방을 불러오지 못했습니다.";
const DEFAULT_ROOM_CREATE_ERROR_MESSAGE = "채팅방을 열지 못했습니다.";
const DEFAULT_MESSAGE_LIST_ERROR_MESSAGE = "메시지를 불러오지 못했습니다.";
const DEFAULT_MESSAGE_SEND_ERROR_MESSAGE = "메시지를 보내지 못했습니다.";
const DEFAULT_READ_ERROR_MESSAGE = "읽음 처리를 하지 못했습니다.";
const DEFAULT_LEAVE_ERROR_MESSAGE = "채팅방을 나가지 못했습니다.";

function jsonRequest(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export async function getMyChatRooms(language: ContentLanguage): Promise<ChatRoomsResult> {
  return requestApiResult<ChatRoomSummaryResponse[], "rooms">(
    withContentLanguage("/api/chat/rooms", language),
    "rooms",
    undefined,
    DEFAULT_ROOM_LIST_ERROR_MESSAGE,
  );
}

export async function getChatRoom(
  chatRoomId: number | string,
  language: ContentLanguage,
): Promise<ChatRoomResult> {
  return requestApiResult<ChatRoomDetailResponse, "room">(
    withContentLanguage(`/api/chat/rooms/${chatRoomId}`, language),
    "room",
    undefined,
    DEFAULT_ROOM_ERROR_MESSAGE,
  );
}

/** 같은 두 사람의 방은 하나뿐이라, 이미 있으면 그 방이 그대로 돌아온다 */
export async function createDirectChatRoom(
  request: CreateDirectChatRoomRequest,
): Promise<ChatRoomResult> {
  return requestApiResult<ChatRoomDetailResponse, "room">(
    "/api/chat/rooms/direct",
    "room",
    jsonRequest("POST", request),
    DEFAULT_ROOM_CREATE_ERROR_MESSAGE,
  );
}

/** 회차당 단체방은 하나뿐이며, 조회 시점의 확정 신청자가 자동으로 합류한다 */
export async function createGroupChatRoom(
  request: CreateGroupChatRoomRequest,
  language: ContentLanguage,
): Promise<ChatRoomResult> {
  return requestApiResult<ChatRoomDetailResponse, "room">(
    withContentLanguage("/api/chat/rooms/group", language),
    "room",
    jsonRequest("POST", request),
    DEFAULT_ROOM_CREATE_ERROR_MESSAGE,
  );
}

export async function getChatMessages(
  chatRoomId: number | string,
  /** 이 메시지보다 과거만 불러온다. 첫 조회면 생략 */
  beforeMessageId: number | null,
  size: number,
  language: ContentLanguage,
): Promise<ChatMessagesResult> {
  const cursor = beforeMessageId === null ? "" : `&beforeMessageId=${beforeMessageId}`;

  return requestApiResult<ChatMessagePageResponse, "messages">(
    withContentLanguage(`/api/chat/rooms/${chatRoomId}/messages?size=${size}${cursor}`, language),
    "messages",
    undefined,
    DEFAULT_MESSAGE_LIST_ERROR_MESSAGE,
  );
}

export async function sendChatMessage(
  chatRoomId: number | string,
  request: SendChatMessageRequest,
): Promise<ChatMessageResult> {
  return requestApiResult<ChatMessageResponse, "message">(
    `/api/chat/rooms/${chatRoomId}/messages`,
    "message",
    jsonRequest("POST", request),
    DEFAULT_MESSAGE_SEND_ERROR_MESSAGE,
  );
}

export async function updateChatRead(
  chatRoomId: number | string,
  request: UpdateChatReadRequest,
): Promise<ChatVoidResult> {
  return requestApiResult<null, "chat">(
    `/api/chat/rooms/${chatRoomId}/read`,
    "chat",
    jsonRequest("PATCH", request),
    DEFAULT_READ_ERROR_MESSAGE,
  );
}

export async function leaveChatRoom(chatRoomId: number | string): Promise<ChatVoidResult> {
  return requestApiResult<null, "chat">(
    `/api/chat/rooms/${chatRoomId}/members/me`,
    "chat",
    { method: "DELETE" },
    DEFAULT_LEAVE_ERROR_MESSAGE,
  );
}

/** 방에 오간 사진만 최신순으로. 합류 이전 사진은 백엔드가 제외한다 */
/** 단체 채팅방 이름 변경. 방장만 가능하며 비우면 활동 제목으로 되돌아간다 */
export async function updateChatRoomTitle(
  chatRoomId: number | string,
  request: UpdateChatRoomTitleRequest,
  language: ContentLanguage,
): Promise<ChatRoomResult> {
  return requestApiResult<ChatRoomDetailResponse, "room">(
    withContentLanguage(`/api/chat/rooms/${chatRoomId}`, language),
    "room",
    jsonRequest("PATCH", request),
    "채팅방 이름을 바꾸지 못했습니다.",
  );
}

/** 참여자 내보내기. 방장만 가능하며 내보낸 사람은 다시 들어오지 않는다 */
export async function removeChatRoomMember(
  chatRoomId: number | string,
  userId: number,
): Promise<ChatVoidResult> {
  return requestApiResult<null, "chat">(
    `/api/chat/rooms/${chatRoomId}/members/${userId}`,
    "chat",
    { method: "DELETE" },
    "참여자를 내보내지 못했습니다.",
  );
}

export async function getChatRoomImages(
  chatRoomId: number | string,
  page: number,
  size: number,
): Promise<ChatRoomImagesResult> {
  return requestApiResult<ChatRoomImagePageResponse, "images">(
    `/api/chat/rooms/${chatRoomId}/images?page=${page}&size=${size}`,
    "images",
    undefined,
    "사진을 불러오지 못했습니다.",
  );
}

/** 저장용 임시 URL로 이어지는 경로. fetch가 아니라 이동시켜야 CORS에 걸리지 않는다 */
export function buildChatImageDownloadUrl(chatRoomId: number | string, messageId: number | string) {
  return `/api/chat/rooms/${chatRoomId}/images/${messageId}/download`;
}

/** 소켓을 열기 직전에만 호출한다. 미리 받아 두면 만료되거나 1회용 제약에 걸린다 */
export async function createChatWsTicket(): Promise<ChatWsTicketResult> {
  return requestApiResult<ChatWsTicketResponse, "ticket">(
    "/api/chat/ws-ticket",
    "ticket",
    { method: "POST" },
    "실시간 연결을 준비하지 못했습니다.",
  );
}
