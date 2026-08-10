"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { openChatRoomStream } from "@/lib/chat/stomp-client";
import { chatKeys } from "@/lib/query/chat";
import type {
  ChatMessagePageResponse,
  ChatMessageResponse,
  ChatReadEvent,
  ChatRoomDetailResponse,
} from "@/types/chat";

/**
 * 열려 있는 채팅방의 실시간 구독.
 * 연결되면 폴링을 멈추고, 끊기면 다시 폴링으로 돌아가도록 연결 상태를 돌려준다.
 */
export function useChatRoomStream(chatRoomId: string) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);

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
        queryClient.setQueryData<ChatRoomDetailResponse>(chatKeys.room(chatRoomId), (current) =>
          applyReadEvent(current, event),
        );
      },
      onConnectedChange: setConnected,
    });

    return close;
  }, [chatRoomId, queryClient]);

  return connected;
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
