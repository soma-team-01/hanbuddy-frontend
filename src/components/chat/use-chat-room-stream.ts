"use client";

import { type InfiniteData, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { openChatRoomStream, type ChatStreamStatus } from "@/lib/chat/stomp-client";
import { chatKeys } from "@/lib/query/chat";
import type { ContentLanguage } from "@/types/content-language";
import type {
  ChatMessagePageResponse,
  ChatMessageResponse,
  ChatReadEvent,
  ChatRoomDetailResponse,
  ChatTranslationEvent,
} from "@/types/chat";

const TRANSLATION_REFRESH_DELAY_MS = 300;

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
    let translationRefreshTimer: ReturnType<typeof setTimeout> | null = null;
    const close = openChatRoomStream(chatRoomId, {
      onMessage: (message) => {
        queryClient.setQueryData<ChatMessagePageResponse>(
          chatKeys.latestMessages(chatRoomId, language),
          (current) => appendMessage(current, message),
        );
        // 목록의 마지막 메시지·안 읽은 수를 갱신한다
        void queryClient.invalidateQueries({ queryKey: chatKeys.rooms() });
        // 기본 메시지 이벤트에는 번역이 없으므로 짧게 모아 최신 페이지를 다시 조회한다.
        // 조회가 캐시 미스를 만들면 백엔드가 지연 번역을 시작한다.
        if (translationRefreshTimer !== null) clearTimeout(translationRefreshTimer);
        translationRefreshTimer = setTimeout(() => {
          translationRefreshTimer = null;
          void queryClient.invalidateQueries({
            queryKey: chatKeys.latestMessages(chatRoomId, language),
          });
        }, TRANSLATION_REFRESH_DELAY_MS);
      },
      onTranslation: (event) => {
        queryClient.setQueryData<ChatMessagePageResponse>(
          chatKeys.latestMessages(chatRoomId, language),
          (current) => applyTranslationEvent(current, event, language),
        );
        queryClient.setQueriesData<InfiniteData<ChatMessagePageResponse>>(
          { queryKey: [...chatKeys.messages(chatRoomId, language), "history"] },
          (current) => applyTranslationToHistory(current, event, language),
        );
        // 방 목록 미리보기도 이미 생성된 번역 캐시를 다시 읽게 한다.
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
            queryClient.invalidateQueries({
              queryKey: chatKeys.latestMessages(chatRoomId, language),
            }),
            queryClient.invalidateQueries({ queryKey: chatKeys.room(chatRoomId, language) }),
          ]);
        }
      },
    });

    return () => {
      if (translationRefreshTimer !== null) clearTimeout(translationRefreshTimer);
      close();
    };
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

/** 현재 화면 언어로 도착한 번역만 해당 메시지에 합친다. 원문은 그대로 보존한다. */
export function applyTranslationEvent(
  current: ChatMessagePageResponse | undefined,
  event: ChatTranslationEvent,
  language: ContentLanguage,
): ChatMessagePageResponse | undefined {
  if (!current || event.contentLanguage !== language) return current;
  const targetIndex = current.messages.findIndex(
    (message) => message.messageId === event.messageId,
  );
  if (targetIndex < 0) return current;

  return {
    ...current,
    messages: current.messages.map((message, index) =>
      index === targetIndex
        ? {
            ...message,
            content: event.content,
            contentLanguage: event.contentLanguage,
          }
        : message,
    ),
  };
}

/** 과거 페이지에서 시작된 번역 이벤트도 현재 화면에 바로 반영한다. */
export function applyTranslationToHistory(
  current: InfiniteData<ChatMessagePageResponse> | undefined,
  event: ChatTranslationEvent,
  language: ContentLanguage,
): InfiniteData<ChatMessagePageResponse> | undefined {
  if (!current || event.contentLanguage !== language) return current;

  return {
    ...current,
    pages: current.pages.map((page) => applyTranslationEvent(page, event, language) ?? page),
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
