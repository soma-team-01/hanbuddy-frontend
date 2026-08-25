"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { openChatRoomStream, type ChatStreamStatus } from "@/lib/chat/stomp-client";
import { chatKeys } from "@/lib/query/chat";
import type { ContentLanguage } from "@/types/content-language";
import type {
  ChatMessagePageResponse,
  ChatMessageResponse,
  ChatReadEvent,
  ChatRoomDetailResponse,
} from "@/types/chat";

/**
 * 열려 있는 채팅방의 실시간 구독.
 * 연결이 끊기면 제한된 횟수만 자동 재시도하고, 실패 후에는 사용자가 직접 다시 시도한다.
 */
export function useChatRoomStream(chatRoomId: string, language: ContentLanguage) {
  const queryClient = useQueryClient();
  const [connection, setConnection] = useState<{
    chatRoomId: string;
    status: ChatStreamStatus;
  }>({ chatRoomId, status: "connecting" });
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    const close = openChatRoomStream(chatRoomId, {
      onMessage: (message) => {
        queryClient.setQueryData<ChatMessagePageResponse>(
          chatKeys.latestMessages(chatRoomId),
          (current) => appendMessage(current, message),
        );
        // 목록의 마지막 메시지·안 읽은 수를 갱신한다
        void queryClient.invalidateQueries({ queryKey: chatKeys.rooms() });
      },
      onRead: (event) => {
        queryClient.setQueryData<ChatRoomDetailResponse>(
          chatKeys.room(chatRoomId, language),
          (current) => applyReadEvent(current, event),
        );
      },
      onStatusChange: (status) => {
        setConnection({ chatRoomId, status });
        if (status === "connected") {
          // REST 조회와 구독 시작 사이 또는 재연결 중 놓친 메시지·읽음 위치를 한 번 맞춘다
          void Promise.all([
            queryClient.invalidateQueries({ queryKey: chatKeys.latestMessages(chatRoomId) }),
            queryClient.invalidateQueries({ queryKey: chatKeys.room(chatRoomId, language) }),
          ]);
        }
      },
    });

    return close;
  }, [chatRoomId, language, queryClient, retryVersion]);

  const retry = useCallback(() => {
    setConnection({ chatRoomId, status: "connecting" });
    setRetryVersion((current) => current + 1);
  }, [chatRoomId]);

  return {
    status: connection.chatRoomId === chatRoomId ? connection.status : "connecting",
    retry,
  };
}

/** 최신 묶음 앞에 새 메시지를 끼운다. 내가 보낸 메시지는 REST 응답으로 이미 들어와 있을 수 있다 */
export function appendMessage(
  current: ChatMessagePageResponse | undefined,
  message: ChatMessageResponse,
): ChatMessagePageResponse | undefined {
  if (!current) return current;
  if (current.messages.some((item) => item.messageId === message.messageId)) return current;

  return { ...current, messages: [message, ...current.messages] };
}

/** 참여자의 읽음 위치를 갱신한다. 뒤로 가는 값은 무시한다 */
export function applyReadEvent(
  current: ChatRoomDetailResponse | undefined,
  event: ChatReadEvent,
): ChatRoomDetailResponse | undefined {
  if (!current) return current;

  return {
    ...current,
    members: current.members.map((member) =>
      member.userId === event.userId && (member.lastReadMessageId ?? 0) < event.lastReadMessageId
        ? { ...member, lastReadMessageId: event.lastReadMessageId }
        : member,
    ),
  };
}
