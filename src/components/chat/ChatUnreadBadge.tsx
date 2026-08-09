"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { myChatRoomsQueryOptions } from "@/lib/query/chat";

/** 내비게이션의 안 읽은 메시지 배지. 읽을 게 없으면 아무것도 그리지 않는다 */
export function ChatUnreadBadge() {
  const t = useTranslations("Chat");
  const roomsQuery = useQuery(myChatRoomsQueryOptions());
  const unreadCount = (roomsQuery.data ?? []).reduce((sum, room) => sum + room.unreadCount, 0);

  if (unreadCount === 0) return null;

  return (
    <span
      aria-label={t("unreadLabel", { count: unreadCount })}
      className="flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 font-display text-[11px] font-bold text-on-primary tabular-nums"
    >
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  );
}
