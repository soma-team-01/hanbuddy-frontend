"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChatImageGrid } from "@/components/chat/ChatImageGrid";
import { useInfiniteScrollSentinel } from "@/components/ui/use-infinite-scroll-sentinel";
import { Avatar } from "@/components/ui/Avatar";
import type { Locale } from "@/i18n/routing";
import { formatChatDateSeparator, groupChatMessages, toChatBubbles } from "@/lib/chat/format";
import { formatSeoulTime } from "@/lib/datetime";
import type { ChatMessageResponse, ChatRoomMemberResponse } from "@/types/chat";
import type { ContentLanguage } from "@/types/content-language";

/** 오래된 순으로 쌓인 메시지 목록. 새 메시지가 오면 바닥으로 붙는다 */
export function ChatMessageList({
  messages,
  members,
  myUserId,
  locale,
  language,
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
  language: ContentLanguage;
  isPending: boolean;
  isError: boolean;
  hasOlder: boolean;
  isLoadingOlder: boolean;
  onLoadOlder: () => void;
  /** 같은 묶음으로 보낸 사진들과, 그중 누른 사진의 위치 */
  onOpenImage: (images: ChatMessageResponse[], index: number) => void;
}>) {
  const t = useTranslations("Chat");
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const heightBeforeLoadRef = useRef(0);
  const [showOriginalByMessageId, setShowOriginalByMessageId] = useState<Record<number, boolean>>(
    {},
  );
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

  function hasTranslation(message: ChatMessageResponse) {
    return (
      message.sourceLanguage !== "UNKNOWN" &&
      message.contentLanguage === language &&
      message.contentLanguage !== message.sourceLanguage &&
      message.originalContent != null
    );
  }

  function displayedContent(message: ChatMessageResponse) {
    return hasTranslation(message) && showOriginalByMessageId[message.messageId]
      ? message.originalContent
      : message.content;
  }

  function translationToggle(message: ChatMessageResponse) {
    if (!hasTranslation(message)) return null;
    const showingOriginal = Boolean(showOriginalByMessageId[message.messageId]);

    return (
      <button
        type="button"
        onClick={() =>
          setShowOriginalByMessageId((current) => ({
            ...current,
            [message.messageId]: !showingOriginal,
          }))
        }
        className="px-1 text-[11px] font-medium text-muted/55 underline-offset-2 transition-colors hover:text-muted hover:underline"
      >
        {showingOriginal ? t("showTranslation") : t("showOriginal")}
      </button>
    );
  }

  function messageMeta(message: ChatMessageResponse | undefined, timestamp: string | null) {
    const toggle = message ? translationToggle(message) : null;
    if (!toggle && !timestamp) return null;

    return (
      <div
        data-testid="chat-message-meta"
        className="mt-0.5 flex min-h-4 items-center gap-1 text-[11px]"
      >
        {timestamp ? <span className="text-muted">{timestamp}</span> : null}
        {timestamp && toggle ? (
          <span aria-hidden="true" className="text-line-strong">
            ·
          </span>
        ) : null}
        {toggle}
      </div>
    );
  }

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
    <div
      ref={scrollRef}
      data-testid="chat-message-list"
      className="flex-1 overflow-y-auto bg-canvas px-4 pt-5 pb-5 md:px-6"
    >
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

                  {toChatBubbles(group.messages).map((bubble, bubbleIndex, bubbles) => {
                    // 사진 묶음은 가장 마지막 사진 기준으로 안 읽은 사람 수를 센다
                    const anchorId =
                      bubble.kind === "images"
                        ? (bubble.images.at(-1)?.messageId ?? 0)
                        : bubble.message.messageId;
                    const unread = mine ? countUnread(anchorId) : 0;
                    const timestamp =
                      bubbleIndex === bubbles.length - 1
                        ? formatSeoulTime(group.timestamp, locale)
                        : null;

                    return (
                      <div
                        key={bubble.key}
                        className={`flex items-end gap-1.5 ${mine ? "flex-row-reverse" : ""}`}
                      >
                        {bubble.kind === "images" ? (
                          <ChatImageGrid
                            images={bubble.images}
                            mine={mine}
                            caption={bubble.images
                              .map((image) => displayedContent(image))
                              .find((content) => content)}
                            captionAction={(() => {
                              const captionMessage = bubble.images.find(
                                (image) => image.originalContent || image.content,
                              );
                              return messageMeta(captionMessage, timestamp);
                            })()}
                            onOpen={(index) => onOpenImage(bubble.images, index)}
                          />
                        ) : (
                          <div className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                            <p
                              className={`max-w-[min(30rem,72vw)] rounded-2xl px-3.5 py-2.5 text-sm leading-6 whitespace-pre-wrap text-ink ${
                                mine ? "border border-primary/25 bg-primary-soft" : "bg-panel"
                              }`}
                            >
                              {displayedContent(bubble.message)}
                            </p>
                            {messageMeta(bubble.message, timestamp)}
                          </div>
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
