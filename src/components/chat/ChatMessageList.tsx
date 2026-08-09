"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/Avatar";
import type { Locale } from "@/i18n/routing";
import { formatChatDateSeparator, isSameSeoulDate } from "@/lib/chat/format";
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
}>) {
  const t = useTranslations("Chat");
  const bottomRef = useRef<HTMLDivElement>(null);
  const newestMessageId = messages.at(-1)?.messageId ?? 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [newestMessageId]);

  // 상대가 어디까지 읽었는지 — 1:1이면 상대 한 명, 단체면 모두가 읽은 지점
  const othersLastRead = members
    .filter((member) => member.userId !== myUserId && !member.left)
    .map((member) => member.lastReadMessageId ?? 0);
  const readUpTo = othersLastRead.length > 0 ? Math.min(...othersLastRead) : 0;

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

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6">
      {hasOlder ? (
        <button
          type="button"
          onClick={onLoadOlder}
          disabled={isLoadingOlder}
          className="mx-auto mb-5 block rounded-full border border-line-strong px-4 py-1.5 text-xs font-semibold text-muted transition-colors enabled:hover:border-primary enabled:hover:text-primary disabled:opacity-60"
        >
          {isLoadingOlder ? t("loadingOlder") : t("loadOlder")}
        </button>
      ) : null}

      {messages.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">{t("noMessagesYet")}</p>
      ) : null}

      <ol className="flex flex-col gap-3">
        {messages.map((message, index) => {
          const previous = messages[index - 1];
          const mine = message.senderId === myUserId;
          const showDate = !previous || !isSameSeoulDate(previous.createdAt, message.createdAt);
          // 같은 사람이 이어서 보내면 이름과 프로필을 반복하지 않는다
          const showSender =
            !mine && (showDate || !previous || previous.senderId !== message.senderId);

          return (
            <li key={message.messageId} className="flex flex-col gap-3">
              {showDate ? (
                <p className="my-2 text-center text-xs font-semibold text-muted">
                  {formatChatDateSeparator(message.createdAt, locale, t)}
                </p>
              ) : null}

              <div className={`flex gap-2.5 ${mine ? "flex-row-reverse" : ""}`}>
                {mine ? null : (
                  <span className="w-8 shrink-0">
                    {showSender ? (
                      <Avatar
                        name={message.senderName}
                        src={message.senderProfileImageUrl}
                        size={32}
                      />
                    ) : null}
                  </span>
                )}

                <div
                  className={`flex min-w-0 flex-col gap-1 ${mine ? "items-end" : "items-start"}`}
                >
                  {showSender ? (
                    <p className="text-xs font-semibold text-muted">{message.senderName}</p>
                  ) : null}
                  <div className={`flex items-end gap-1.5 ${mine ? "flex-row-reverse" : ""}`}>
                    <p
                      className={`max-w-[min(30rem,72vw)] rounded-2xl px-3.5 py-2.5 text-sm leading-6 whitespace-pre-wrap ${
                        mine
                          ? "bg-primary text-on-primary"
                          : "border border-line-soft bg-canvas-soft text-ink"
                      }`}
                    >
                      {message.content}
                    </p>
                    <span className="flex shrink-0 flex-col items-end text-[11px] text-muted">
                      {mine && readUpTo >= message.messageId ? (
                        <span className="font-semibold text-primary">{t("readBy")}</span>
                      ) : null}
                      <span>{formatSeoulTime(message.createdAt, locale) ?? ""}</span>
                    </span>
                  </div>
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
