"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { updateChatRead } from "@/lib/api/chat";
import { chatKeys, myChatRoomsQueryOptions } from "@/lib/query/chat";
import { unwrapApiResult } from "@/lib/query/result";

/**
 * 안 읽은 대화를 한 번에 읽음 처리한다.
 * 백엔드는 방 단위로만 읽음 위치를 받으므로, 안 읽은 방들의 마지막 메시지까지 각각 올린다.
 */
export function ChatMarkAllReadButton() {
  const t = useTranslations("Chat");
  const queryClient = useQueryClient();
  const roomsQuery = useQuery(myChatRoomsQueryOptions());
  // 대화가 없는 방은 올릴 위치가 없어 건너뛴다
  const unreadRooms = (roomsQuery.data ?? []).filter(
    (room) => room.unreadCount > 0 && room.lastMessage !== null,
  );

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        unreadRooms.map(async (room) =>
          unwrapApiResult(
            await updateChatRead(room.chatRoomId, {
              lastReadMessageId: room.lastMessage?.messageId ?? 0,
            }),
            "chat",
          ),
        ),
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: chatKeys.all() });
    },
  });

  if (unreadRooms.length === 0) return null;

  return (
    <button
      type="button"
      disabled={markAllReadMutation.isPending}
      onClick={() => markAllReadMutation.mutate()}
      className="shrink-0 rounded-full border border-line-strong px-3 py-1 font-display text-xs font-semibold text-muted transition-colors enabled:hover:border-primary enabled:hover:text-primary disabled:opacity-60"
    >
      {markAllReadMutation.isPending ? t("markingAllRead") : t("markAllRead")}
    </button>
  );
}
