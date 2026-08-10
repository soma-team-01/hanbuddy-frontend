"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  chatMessageHistoryQueryOptions,
  latestChatMessagesQueryOptions,
  mergeChatMessages,
} from "@/lib/query/chat";
import type { ChatMessageResponse } from "@/types/chat";

/**
 * 대화방의 메시지를 모아 주는 훅.
 *
 * 최신 묶음은 폴링·실시간으로 계속 갈리고, 과거는 위로 스크롤할 때 페이지 단위로 붙는다.
 * 새 메시지 하나에 최신 창이 한 칸 밀린다고 쌓아 둔 과거를 다시 받지 않도록 두 가지를 지킨다.
 *
 * 1. 이미 본 메시지를 누적한다 — 최신 창에서 밀려나도 화면에서 사라지지 않는다.
 * 2. 과거 조회의 시작 경계를 처음 한 번만 잡고 고정한다 — 쿼리 키가 그대로라 쌓아 둔 페이지가 유지된다.
 *
 * 폴링 사이에 한 페이지를 넘는 메시지가 몰리면 새 최신 창이 알던 것과 하나도 겹치지 않는다.
 * 그 사이 메시지는 어디서도 받을 수 없으므로, 겹침이 없으면 누적분을 버리고 새 경계에서 다시 시작한다.
 * 경계가 바뀌면 쿼리 키도 바뀌어 이어 붙일 수 없게 된 과거 페이지가 함께 정리된다.
 */
export function useChatMessages(chatRoomId: string, live: boolean) {
  const latestQuery = useQuery(latestChatMessagesQueryOptions(chatRoomId, live));

  // 과거 조회의 시작점. 최신 창이 밀려도 따라가지 않는다
  const [historyBoundaryId, setHistoryBoundaryId] = useState(0);
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);

  const historyQuery = useInfiniteQuery({
    ...chatMessageHistoryQueryOptions(chatRoomId, historyBoundaryId),
    enabled: historyBoundaryId > 0 && Boolean(latestQuery.data?.hasNext),
  });

  // 받아 온 묶음이 갈렸을 때만 다시 합친다. 페이지 배열은 렌더마다 새로 만들어지므로 원본으로 비교한다
  const [mergedSources, setMergedSources] = useState<{ latest: unknown; history: unknown }>({
    latest: undefined,
    history: undefined,
  });

  if (mergedSources.latest !== latestQuery.data || mergedSources.history !== historyQuery.data) {
    const latestMessages = latestQuery.data?.messages ?? [];
    const historyMessages = (historyQuery.data?.pages ?? []).flatMap((page) => page.messages);
    const known = new Set(messages.map((item) => item.messageId));
    // 알던 메시지와 하나도 겹치지 않으면 그 사이가 통째로 비어 있다 — 이어 붙일 수 없다
    const disjoint =
      known.size > 0 &&
      latestMessages.length > 0 &&
      !latestMessages.some((item) => known.has(item.messageId));

    setMergedSources({ latest: latestQuery.data, history: historyQuery.data });
    // 다시 시작할 때는 과거 페이지도 함께 버린다 — 옛 경계에서 받은 것이라 새 창에 이어지지 않는다
    setMessages(
      disjoint
        ? mergeChatMessages(latestMessages)
        : mergeChatMessages(messages, latestMessages, historyMessages),
    );

    const windowOldestId = latestMessages.at(-1)?.messageId ?? 0;
    if (windowOldestId > 0 && (historyBoundaryId === 0 || disjoint)) {
      setHistoryBoundaryId(windowOldestId);
    }
  }

  return {
    messages,
    isPending: latestQuery.isPending,
    isError: latestQuery.isError,
    hasOlder: Boolean(historyQuery.hasNextPage || latestQuery.data?.hasNext),
    isLoadingOlder: historyQuery.isFetchingNextPage,
    loadOlder: () => void historyQuery.fetchNextPage(),
  };
}
