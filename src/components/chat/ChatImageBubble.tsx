"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ChatMessageResponse } from "@/types/chat";

/** 사진 말풍선. 비율을 알면 그대로 잡아 로딩 중 화면이 튀지 않게 한다 */
export function ChatImageBubble({
  message,
  mine,
  onOpen,
}: Readonly<{
  message: ChatMessageResponse;
  mine: boolean;
  onOpen: () => void;
}>) {
  const t = useTranslations("Chat");
  const width = message.imageWidth ?? 4;
  const height = message.imageHeight ?? 3;

  return (
    <figure
      className={`flex max-w-[min(18rem,64vw)] flex-col gap-1 ${mine ? "items-end" : "items-start"}`}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={t("openPhoto")}
        className="block w-full overflow-hidden rounded-2xl border border-line-soft transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Image
          src={message.imageUrl ?? ""}
          alt={message.content ?? t("photo")}
          width={width}
          height={height}
          sizes="288px"
          className="h-auto w-full object-cover"
        />
      </button>
      {message.content ? (
        <figcaption
          className={`max-w-full rounded-2xl px-3.5 py-2 text-sm leading-6 whitespace-pre-wrap text-ink ${
            mine ? "border border-primary/25 bg-primary-soft" : "bg-panel"
          }`}
        >
          {message.content}
        </figcaption>
      ) : null}
    </figure>
  );
}
