"use client";

import { useTranslations } from "next-intl";
import { ChatPhoto } from "@/components/chat/ChatPhoto";
import { chatPhotoRows } from "@/lib/chat/format";
import type { ChatMessageResponse } from "@/types/chat";

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
  // 줄마다 칸을 나눠 가져 마지막 줄에도 빈칸이 남지 않는다
  const rows = chatPhotoRows(images.length).reduce<
    { startIndex: number; images: ChatMessageResponse[] }[]
  >((collected, size) => {
    const startIndex = collected.reduce((total, row) => total + row.images.length, 0);
    collected.push({ startIndex, images: images.slice(startIndex, startIndex + size) });
    return collected;
  }, []);
  // 첫 줄의 칸 수가 줄 높이를 정한다 (3칸이면 가로:세로 = 3:1)
  const rowAspectRatio = rows[0]?.images.length ?? 1;

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
          <ChatPhoto
            imageUrl={single.imageUrl ?? ""}
            alt={single.content ?? t("photo")}
            imageWidth={single.imageWidth}
            imageHeight={single.imageHeight}
            sizes="288px"
          />
        </button>
      </ImageFigure>
    );
  }

  return (
    <ImageFigure mine={mine} caption={caption}>
      <div
        data-testid="chat-photo-grid"
        className="flex w-full flex-col gap-0.5 overflow-hidden rounded-2xl border border-line-soft"
      >
        {rows.map((row) => (
          // 줄마다 높이를 같게 두어, 칸 수가 달라도 위아래 줄이 같은 높이로 보인다
          <div
            key={row.startIndex}
            data-testid="chat-photo-row"
            style={{ aspectRatio: rowAspectRatio }}
            className="flex gap-0.5"
          >
            {row.images.map((image, indexInRow) => (
              <button
                key={image.messageId}
                type="button"
                onClick={() => onOpen(row.startIndex + indexInRow)}
                aria-label={t("openPhotoAt", {
                  index: row.startIndex + indexInRow + 1,
                  total: images.length,
                })}
                className="block h-full min-w-0 flex-1 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
              >
                <ChatPhoto imageUrl={image.imageUrl ?? ""} alt="" stretch sizes="144px" />
              </button>
            ))}
          </div>
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
