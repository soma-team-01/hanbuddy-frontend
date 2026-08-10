"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { CheckIcon, MoreHorizontalIcon } from "@/components/ui/icons";
import { updateChatRead } from "@/lib/api/chat";
import { chatKeys, myChatRoomsQueryOptions } from "@/lib/query/chat";
import { unwrapApiResult } from "@/lib/query/result";

/**
 * 대화 목록 상단의 더 보기 메뉴.
 * 백엔드는 방 단위로만 읽음 위치를 받으므로, 안 읽은 방들의 마지막 메시지까지 각각 올린다.
 */
export function ChatListMenu() {
  const t = useTranslations("Chat");
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const roomsQuery = useQuery(myChatRoomsQueryOptions());
  // 대화가 없는 방은 올릴 위치가 없어 건너뛴다
  const unreadRooms = (roomsQuery.data ?? []).filter(
    (room) => room.unreadCount > 0 && room.lastMessage !== null,
  );

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      // 하나가 실패해도 나머지가 끝날 때까지 기다린다 — 먼저 끊고 나가면 성공한 방의 배지가 남는다
      const results = await Promise.allSettled(
        unreadRooms.map(async (room) =>
          unwrapApiResult(
            await updateChatRead(room.chatRoomId, {
              lastReadMessageId: room.lastMessage?.messageId ?? 0,
            }),
            "chat",
          ),
        ),
      );

      const failed = results.find((result) => result.status === "rejected");
      if (failed) throw failed.reason;
    },
    onSuccess: () => setIsOpen(false),
    // 일부만 성공했어도 그만큼은 반영해야 한다
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: chatKeys.all() });
    },
  });

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={t("listMenu")}
        onClick={() => setIsOpen((open) => !open)}
        className="flex size-8 items-center justify-center rounded-full text-muted transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <MoreHorizontalIcon className="size-5" />
      </button>

      {isOpen ? (
        <div
          role="menu"
          aria-label={t("listMenu")}
          className="absolute top-[calc(100%+8px)] right-0 z-50 min-w-52 overflow-hidden rounded-2xl border border-line-soft bg-white p-1.5 shadow-[0_18px_48px_rgba(38,27,24,0.14)]"
        >
          <button
            type="button"
            role="menuitem"
            disabled={unreadRooms.length === 0 || markAllReadMutation.isPending}
            onClick={() => markAllReadMutation.mutate()}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-ink transition-colors enabled:hover:text-primary disabled:text-muted disabled:opacity-60"
          >
            <CheckIcon className="size-4 shrink-0" />
            {markAllReadMutation.isPending ? t("markingAllRead") : t("markAllRead")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
