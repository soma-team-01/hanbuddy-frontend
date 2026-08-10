"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { MessageCircleIcon } from "@/components/ui/icons";
import { Link, usePathname } from "@/i18n/navigation";
import { myChatRoomsQueryOptions } from "@/lib/query/chat";

/** 전역 내비게이션의 채팅 진입점. 안 읽은 메시지가 있으면 점으로 알린다 */
export function ChatNavIcon({ compact = false }: Readonly<{ compact?: boolean }>) {
  const t = useTranslations("Chat");
  const pathname = usePathname() ?? "";
  const roomsQuery = useQuery(myChatRoomsQueryOptions());
  const unreadCount = (roomsQuery.data ?? []).reduce((sum, room) => sum + room.unreadCount, 0);
  const active = pathname === "/chat" || pathname.startsWith("/chat/");
  const size = compact ? "size-10" : "size-11";

  return (
    // 테두리·배경 없이 아이콘만 둔다. 현재 화면은 색으로만 알린다
    <Link
      href="/chat"
      aria-label={unreadCount > 0 ? t("unreadLabel", { count: unreadCount }) : t("title")}
      title={t("title")}
      aria-current={active ? "page" : undefined}
      className={`relative inline-flex ${size} items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        active ? "text-primary" : "text-ink hover:text-primary"
      }`}
    >
      <MessageCircleIcon className="size-6" />
      {unreadCount > 0 ? (
        <span
          aria-hidden="true"
          className="absolute top-0.5 right-0.5 flex min-w-[17px] items-center justify-center rounded-full border-2 border-canvas bg-primary px-1 font-display text-[10px] leading-[14px] font-bold text-on-primary tabular-nums"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
