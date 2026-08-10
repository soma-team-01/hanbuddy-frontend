"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { ChatImageBubble } from "@/components/chat/ChatImageBubble";
import { useInfiniteScrollSentinel } from "@/components/ui/use-infinite-scroll-sentinel";
import { Avatar } from "@/components/ui/Avatar";
import type { Locale } from "@/i18n/routing";
import { formatChatDateSeparator, groupChatMessages } from "@/lib/chat/format";
import { formatSeoulTime } from "@/lib/datetime";
import type { ChatMessageResponse, ChatRoomMemberResponse } from "@/types/chat";

/** 오래된 순으로 쌓인 메시지 목록. 새 메시지가 오면 바닥으로 붙는다 */
export function ChatMessageList({
  messages,
  members,
  myUserId,
  locale,
  isPending,
  isError,
  hasOlder,
  isLoadingOlder,
  onLoadOlder,
  onOpenImage,
}: Readonly<{
  messages: ChatMessageResponse[];
  members: ChatRoomMemberResponse[];
  myUserId: number | undefined;
  locale: Locale;
  isPending: boolean;
  isError: boolean;
  hasOlder: boolean;
  isLoadingOlder: boolean;
  onLoadOlder: () => void;
  onOpenImage: (message: ChatMessageResponse) => void;
}>) {
  const t = useTranslations("Chat");
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const heightBeforeLoadRef = useRef(0);
  const newestMessageId = messages.at(-1)?.messageId ?? 0;
  const oldestMessageId = messages[0]?.messageId ?? 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [newestMessageId]);

  // 위쪽에 이전 메시지가 붙으면 화면이 밀리므로, 늘어난 높이만큼 되돌려 보던 자리를 지킨다
  useLayoutEffect(() => {
    const container = scrollRef.current;
    const heightBeforeLoad = heightBeforeLoadRef.current;
    if (!container || heightBeforeLoad === 0) return;

    container.scrollTop += container.scrollHeight - heightBeforeLoad;
    heightBeforeLoadRef.current = 0;
  }, [oldestMessageId]);

  function loadOlder() {
    heightBeforeLoadRef.current = scrollRef.current?.scrollHeight ?? 0;
    onLoadOlder();
  }

  const olderSentinelRef = useInfiniteScrollSentinel(loadOlder, hasOlder && !isLoadingOlder);

  const others = members.filter((member) => member.userId !== myUserId && !member.left);

  // 합류 이전 메시지는 그 사람에게 보이지 않으므로 안 읽은 사람으로 세지 않는다
  function countUnread(messageId: number) {
    return others.filter(
      (member) =>
        (member.visibleFromMessageId ?? 0) < messageId &&
        (member.lastReadMessageId ?? 0) < messageId,
    ).length;
  }

  if (isPending) {
    return <p className="flex-1 p-8 text-center text-sm text-muted">{t("loading")}</p>;
  }

  if (isError) {
    return (
      <p role="alert" className="flex-1 p-8 text-center text-sm text-danger">
        {t("messagesLoadError")}
      </p>
    );
  }

  const groups = groupChatMessages(messages);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto bg-canvas px-4 py-5 md:px-6">
      {/* 위로 끝까지 올리면 이전 메시지를 알아서 이어 붙인다 */}
      <div ref={olderSentinelRef} aria-hidden="true" className="h-px" />
      {isLoadingOlder ? (
        <p className="mb-4 text-center text-xs text-muted">{t("loadingOlder")}</p>
      ) : null}

      {messages.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">{t("noMessagesYet")}</p>
      ) : null}

      <ol className="flex flex-col gap-4">
        {groups.map((group) => {
          const mine = group.senderId === myUserId;

          return (
            <li key={group.key} className="flex flex-col gap-4">
              {group.startsNewDate ? (
                <p className="my-1 text-center text-xs font-semibold text-muted">
                  {formatChatDateSeparator(group.timestamp, locale, t)}
                </p>
              ) : null}

              <div className={`flex gap-2.5 ${mine ? "flex-row-reverse" : ""}`}>
                {mine ? null : (
                  <Avatar
                    name={group.senderName}
                    src={group.senderProfileImageUrl}
                    size={32}
                    className="mt-5 shrink-0"
                  />
                )}

                <div
                  className={`flex min-w-0 flex-col gap-1 ${mine ? "items-end" : "items-start"}`}
                >
                  {mine ? null : (
                    <p className="text-xs font-semibold text-muted">{group.senderName}</p>
                  )}

                  {group.messages.map((message) => {
                    const unread = mine ? countUnread(message.messageId) : 0;

                    return (
                      <div
                        key={message.messageId}
                        className={`flex items-end gap-1.5 ${mine ? "flex-row-reverse" : ""}`}
                      >
                        {message.messageType === "IMAGE" && message.imageUrl ? (
                          <ChatImageBubble
                            message={message}
                            mine={mine}
                            onOpen={() => onOpenImage(message)}
                          />
                        ) : (
                          <p
                            className={`max-w-[min(30rem,72vw)] rounded-2xl px-3.5 py-2.5 text-sm leading-6 whitespace-pre-wrap text-ink ${
                              mine ? "border border-primary/25 bg-primary-soft" : "bg-panel"
                            }`}
                          >
                            {message.content}
                          </p>
                        )}
                        {unread > 0 ? (
                          <span
                            aria-label={t("unreadByCount", { count: unread })}
                            className="shrink-0 pb-1 font-display text-[11px] font-bold text-primary tabular-nums"
                          >
                            {unread}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}

                  {/* 묶음당 시각은 한 번만 — 같은 사람이 같은 분에 보낸 메시지 아래에 붙는다 */}
                  <p className="mt-0.5 text-[11px] text-muted">
                    {formatSeoulTime(group.timestamp, locale) ?? ""}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <div ref={bottomRef} />
    </div>
  );
}
