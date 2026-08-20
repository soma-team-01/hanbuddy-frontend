import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { getChatMessages, getChatRoom, getChatRoomImages, getMyChatRooms } from "@/lib/api/chat";
import type { ChatMessageResponse } from "@/types/chat";
import { unwrapApiResult } from "./result";

/** 위로 스크롤하며 과거를 불러오는 흐름이라 한 번에 30건씩 가져온다 */
export const CHAT_MESSAGE_PAGE_SIZE = 30;

/**
 * 목록·안 읽은 수 배지 주기. 대화방 밖에서는 소켓이 없어 이 값이 곧 반응 속도가 된다.
 * 탭이 백그라운드면 TanStack이 자동으로 멈춘다.
 */
export const CHAT_ROOM_LIST_POLL_INTERVAL = 15_000;

export const chatKeys = {
  all: () => ["chat"] as const,
  rooms: () => [...chatKeys.all(), "rooms"] as const,
  room: (chatRoomId: number | string) => [...chatKeys.all(), "room", String(chatRoomId)] as const,
  messages: (chatRoomId: number | string) =>
    [...chatKeys.all(), "messages", String(chatRoomId)] as const,
  images: (chatRoomId: number | string) =>
    [...chatKeys.all(), "images", String(chatRoomId)] as const,
  latestMessages: (chatRoomId: number | string) =>
    [...chatKeys.messages(chatRoomId), "latest"] as const,
  messageHistory: (chatRoomId: number | string, boundaryId: number) =>
    [...chatKeys.messages(chatRoomId), "history", boundaryId] as const,
};

export function myChatRoomsQueryOptions() {
  return queryOptions({
    queryKey: chatKeys.rooms(),
    queryFn: async () => unwrapApiResult(await getMyChatRooms(), "rooms"),
    refetchInterval: CHAT_ROOM_LIST_POLL_INTERVAL,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
  });
}

/**
 * 방 상세(참여자·읽음 위치). 최초 조회와 WebSocket 연결·재연결 직후 동기화에만 사용한다.
 */
export function chatRoomQueryOptions(chatRoomId: number | string) {
  return queryOptions({
    queryKey: chatKeys.room(chatRoomId),
    queryFn: async () => unwrapApiResult(await getChatRoom(chatRoomId), "room"),
    refetchInterval: false,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
}

/**
 * 대화방의 최신 묶음. 최초 조회와 WebSocket 연결·재연결 직후 동기화에만 사용한다.
 */
export function latestChatMessagesQueryOptions(chatRoomId: number | string) {
  return queryOptions({
    queryKey: chatKeys.latestMessages(chatRoomId),
    queryFn: async () =>
      unwrapApiResult(await getChatMessages(chatRoomId, null, CHAT_MESSAGE_PAGE_SIZE), "messages"),
    refetchInterval: false,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
}

/**
 * 위로 스크롤할 때만 늘어나는 과거 메시지. 폴링하지 않는다.
 *
 * 시작 경계(`boundaryId`)는 키에 들어가지만, 호출부가 이 값을 **고정**해서 넘긴다.
 * 최신 창의 가장 오래된 ID를 그대로 흘려보내면 메시지가 하나 올 때마다 키가 바뀌어
 * 쌓아 둔 페이지가 통째로 버려지고 처음부터 다시 받게 된다.
 * 경계가 바뀌는 건 이어 붙일 수 없을 만큼 창이 멀어져 다시 시작해야 할 때뿐이고,
 * 그때는 키가 함께 바뀌어 낡은 페이지가 정리되는 편이 맞다.
 */
export function chatMessageHistoryQueryOptions(chatRoomId: number | string, boundaryId: number) {
  return infiniteQueryOptions({
    queryKey: chatKeys.messageHistory(chatRoomId, boundaryId),
    queryFn: async ({ pageParam }) =>
      unwrapApiResult(
        await getChatMessages(chatRoomId, pageParam, CHAT_MESSAGE_PAGE_SIZE),
        "messages",
      ),
    initialPageParam: boundaryId,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.nextCursor : undefined),
    staleTime: Infinity,
  });
}

/** 최신 묶음과 과거 묶음을 합쳐 오래된 순으로 정렬한다. 중복 메시지는 하나만 남긴다 */
export function mergeChatMessages(...groups: ChatMessageResponse[][]): ChatMessageResponse[] {
  const byId = new Map<number, ChatMessageResponse>();
  for (const group of groups) {
    for (const message of group) byId.set(message.messageId, message);
  }

  return [...byId.values()].sort((left, right) => left.messageId - right.messageId);
}

/** 사진함은 한 번에 30장씩 */
export const CHAT_IMAGE_PAGE_SIZE = 30;

export function chatRoomImagesQueryOptions(chatRoomId: number | string) {
  return infiniteQueryOptions({
    queryKey: chatKeys.images(chatRoomId),
    queryFn: async ({ pageParam }) =>
      unwrapApiResult(
        await getChatRoomImages(chatRoomId, pageParam, CHAT_IMAGE_PAGE_SIZE),
        "images",
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
    staleTime: 30_000,
  });
}
