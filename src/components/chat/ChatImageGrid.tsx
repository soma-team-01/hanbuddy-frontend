"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ChatMessageResponse } from "@/types/chat";

/** 장수에 따른 열 수 — 4장만 2열이고 나머지는 3열로 채운다 */
function columnsFor(count: number) {
  if (count === 2) return "grid-cols-2";
  if (count === 4) return "grid-cols-2";

  return "grid-cols-3";
}

/**
 * 한 번에 보낸 사진 묶음. 카카오톡처럼 격자로 붙여 하나의 덩어리로 보이게 한다.
 * 한 장이면 원본 비율 그대로, 여러 장이면 정사각형으로 잘라 채운다.
 */
export function ChatImageGrid({
  images,
  mine,
  onOpen,
}: Readonly<{
  images: ChatMessageResponse[];
  mine: boolean;
  onOpen: (index: number) => void;
}>) {
  const t = useTranslations("Chat");
  const caption = images.find((image) => image.content)?.content;

  if (images.length === 1) {
    const single = images[0];

    return (
      <ImageFigure mine={mine} caption={caption}>
        <button
          type="button"
          onClick={() => onOpen(0)}
          aria-label={t("openPhoto")}
          className="block w-full overflow-hidden rounded-2xl border border-line-soft transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Image
            src={single.imageUrl ?? ""}
            alt={single.content ?? t("photo")}
            width={single.imageWidth ?? 4}
            height={single.imageHeight ?? 3}
            sizes="288px"
            className="h-auto w-full object-cover"
          />
        </button>
      </ImageFigure>
    );
  }

  return (
    <ImageFigure mine={mine} caption={caption}>
      <div
        className={`grid gap-0.5 overflow-hidden rounded-2xl border border-line-soft ${columnsFor(
          images.length,
        )}`}
      >
        {images.map((image, index) => (
          <button
            key={image.messageId}
            type="button"
            onClick={() => onOpen(index)}
            aria-label={t("openPhotoAt", { index: index + 1, total: images.length })}
            className="relative aspect-square transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
          >
            <Image src={image.imageUrl ?? ""} alt="" fill sizes="96px" className="object-cover" />
          </button>
        ))}
      </div>
    </ImageFigure>
  );
}

function ImageFigure({
  mine,
  caption,
  children,
}: Readonly<{ mine: boolean; caption?: string | null; children: React.ReactNode }>) {
  return (
    <figure
      className={`flex w-[min(18rem,64vw)] flex-col gap-1 ${mine ? "items-end" : "items-start"}`}
    >
      {children}
      {caption ? (
        <figcaption
          className={`max-w-full rounded-2xl px-3.5 py-2 text-sm leading-6 whitespace-pre-wrap text-ink ${
            mine ? "border border-primary/25 bg-primary-soft" : "bg-panel"
          }`}
        >
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
