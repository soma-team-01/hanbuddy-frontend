"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/Avatar";
import { UsersIcon } from "@/components/ui/icons";
import { Link, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatChatTimestamp } from "@/lib/chat/format";
import { myChatRoomsQueryOptions } from "@/lib/query/chat";

/** 내 채팅방 목록. 대화 화면 옆에도 그대로 붙는다 */
export function ChatRoomList({ activeRoomId }: Readonly<{ activeRoomId?: string }>) {
  const t = useTranslations("Chat");
  const locale = useLocale() as Locale;
  const pathname = usePathname() ?? "";
  const roomsQuery = useQuery(myChatRoomsQueryOptions());
  const rooms = roomsQuery.data ?? [];

  if (roomsQuery.isPending) {
    return <p className="p-6 text-center text-sm text-muted">{t("loading")}</p>;
  }

  if (roomsQuery.isError) {
    return (
      <p role="alert" className="p-6 text-center text-sm text-danger">
        {t("loadError")}
      </p>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="font-display text-sm font-bold text-ink">{t("empty")}</p>
        <p className="mt-1 text-sm leading-6 text-muted">{t("emptyDescription")}</p>
      </div>
    );
  }

  return (
    <ul aria-label={t("title")} className="flex flex-col">
      {rooms.map((room) => {
        const href = `/chat/${room.chatRoomId}`;
        const active = activeRoomId === String(room.chatRoomId) || pathname === href;

        return (
          <li key={room.chatRoomId}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 border-b border-l-2 border-line-soft py-3.5 pr-4 pl-3.5 transition-colors ${
                active ? "border-l-primary" : "border-l-transparent hover:border-l-primary/40"
              }`}
            >
              <span className="relative shrink-0">
                <Avatar name={room.title} src={room.imageUrl} size={44} />
                {room.roomType === "GROUP" ? (
                  <span
                    aria-hidden="true"
                    className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full border border-canvas-soft bg-primary text-on-primary"
                  >
                    <UsersIcon className="size-3" />
                  </span>
                ) : null}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span
                    className={`truncate font-display text-sm font-bold ${
                      active ? "text-primary" : "text-ink"
                    }`}
                  >
                    {room.title}
                  </span>
                  {room.lastMessage ? (
                    <span className="shrink-0 text-xs text-muted">
                      {formatChatTimestamp(room.lastMessage.createdAt, locale, t)}
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="truncate text-sm text-muted">
                    {room.lastMessage ? room.lastMessage.content : t("noMessagesYet")}
                  </span>
                  {room.unreadCount > 0 ? (
                    <span
                      aria-label={t("unreadLabel", { count: room.unreadCount })}
                      className="flex min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 font-display text-[11px] font-bold text-on-primary tabular-nums"
                    >
                      {room.unreadCount > 99 ? "99+" : room.unreadCount}
                    </span>
                  ) : null}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
