import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { getChatMessages, getChatRoom, getChatRoomImages, getMyChatRooms } from "@/lib/api/chat";
import type { ChatMessageResponse } from "@/types/chat";
import { unwrapApiResult } from "./result";

/** 위로 스크롤하며 과거를 불러오는 흐름이라 한 번에 30건씩 가져온다 */
export const CHAT_MESSAGE_PAGE_SIZE = 30;

/**
 * 실시간 구독(STOMP)이 끊겼을 때만 쓰는 대비책이다.
 * 연결되어 있는 동안에는 폴링을 멈추고 브로드캐스트로 받는다.
 */
export const CHAT_MESSAGE_POLL_INTERVAL = 2_500;
export const CHAT_ROOM_LIST_POLL_INTERVAL = 20_000;

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
 * 방 상세(참여자·읽음 위치).
 * 말풍선 옆 "안 읽은 사람 수"가 여기서 나오므로, 실시간 구독이 끊겼을 때는 메시지와 같은 주기로
 * 다시 받아 숫자가 멈춰 있지 않게 한다.
 */
export function chatRoomQueryOptions(chatRoomId: number | string, live = false) {
  return queryOptions({
    queryKey: chatKeys.room(chatRoomId),
    queryFn: async () => unwrapApiResult(await getChatRoom(chatRoomId), "room"),
    refetchInterval: live ? false : CHAT_MESSAGE_POLL_INTERVAL,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
}

/**
 * 대화방의 최신 묶음.
 * 실시간 구독이 살아 있으면(`live`) 폴링을 끄고, 끊겼을 때만 주기적으로 다시 받는다.
 */
export function latestChatMessagesQueryOptions(chatRoomId: number | string, live = false) {
  return queryOptions({
    queryKey: chatKeys.latestMessages(chatRoomId),
    queryFn: async () =>
      unwrapApiResult(await getChatMessages(chatRoomId, null, CHAT_MESSAGE_PAGE_SIZE), "messages"),
    refetchInterval: live ? false : CHAT_MESSAGE_POLL_INTERVAL,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
}

/** 위로 스크롤할 때만 늘어나는 과거 메시지. 폴링하지 않는다 */
export function chatMessageHistoryQueryOptions(chatRoomId: number | string, oldestKnownId: number) {
  return infiniteQueryOptions({
    queryKey: [...chatKeys.messages(chatRoomId), "history", oldestKnownId],
    queryFn: async ({ pageParam }) =>
      unwrapApiResult(
        await getChatMessages(chatRoomId, pageParam, CHAT_MESSAGE_PAGE_SIZE),
        "messages",
      ),
    initialPageParam: oldestKnownId,
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
