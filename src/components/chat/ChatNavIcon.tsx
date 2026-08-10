"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { MessageSquareIcon } from "@/components/ui/icons";
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
    <Link
      href="/chat"
      aria-label={unreadCount > 0 ? t("unreadLabel", { count: unreadCount }) : t("title")}
      title={t("title")}
      aria-current={active ? "page" : undefined}
      className={`relative inline-flex ${size} items-center justify-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        active
          ? "border-primary bg-primary-soft text-primary"
          : "border-line-strong bg-canvas-soft text-ink hover:border-primary hover:text-primary"
      }`}
    >
      <MessageSquareIcon className="size-5" />
      {unreadCount > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 flex min-w-[18px] items-center justify-center rounded-full border-2 border-canvas bg-primary px-1 font-display text-[10px] leading-4 font-bold text-on-primary tabular-nums"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
