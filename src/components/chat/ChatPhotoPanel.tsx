"use client";

import Image from "next/image";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { DownloadIcon, XIcon } from "@/components/ui/icons";
import type { Locale } from "@/i18n/routing";
import { buildChatImageDownloadUrl } from "@/lib/api/chat";
import { formatSeoulDate } from "@/lib/datetime";
import { chatRoomImagesQueryOptions } from "@/lib/query/chat";

/** 대화에 오간 사진만 모아 보는 칸. 눌러서 저장할 수 있다 */
export function ChatPhotoPanel({
  chatRoomId,
  onClose,
}: Readonly<{ chatRoomId: string; onClose: () => void }>) {
  const t = useTranslations("Chat");
  const locale = useLocale() as Locale;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const imagesQuery = useInfiniteQuery(chatRoomImagesQueryOptions(chatRoomId));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const images = (imagesQuery.data?.pages ?? []).flatMap((page) => page.images);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="chat-photo-panel-title"
      onClose={onClose}
      className="motion-dialog m-0 flex max-h-[85dvh] w-full max-w-none flex-col overflow-hidden rounded-t-3xl border-0 bg-canvas-soft p-0 text-ink shadow-2xl backdrop:bg-ink/45 backdrop:backdrop-blur-[3px] max-md:mt-auto md:m-auto md:w-[calc(100%-3rem)] md:max-w-2xl md:rounded-2xl"
    >
      <div className="flex items-center justify-between gap-4 border-b border-line-soft px-6 py-4">
        <h2 id="chat-photo-panel-title" className="font-display text-lg font-bold text-ink">
          {t("photoPanel")}
        </h2>
        <button
          type="button"
          aria-label={t("closePhotoPanel")}
          onClick={onClose}
          className="flex size-10 items-center justify-center rounded-full text-muted transition-colors hover:text-primary"
        >
          <XIcon className="size-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {imagesQuery.isPending ? <p className="text-sm text-muted">{t("loading")}</p> : null}
        {imagesQuery.isError ? (
          <p role="alert" className="text-sm text-danger">
            {t("photosLoadError")}
          </p>
        ) : null}
        {!imagesQuery.isPending && !imagesQuery.isError && images.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">{t("photoPanelEmpty")}</p>
        ) : null}

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image) => (
            <li key={image.messageId} className="flex flex-col gap-1.5">
              <span className="relative aspect-square overflow-hidden rounded-xl border border-line-soft bg-panel">
                <Image
                  src={image.imageUrl}
                  alt={t("sentBy", { name: image.senderName })}
                  fill
                  sizes="(max-width: 640px) 45vw, 200px"
                  className="object-cover"
                />
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-xs text-muted">
                  {formatSeoulDate(image.createdAt, locale) ?? ""}
                </span>
                {/* 저장용 임시 URL로 이동시킨다 — fetch로 부르면 리다이렉트가 CORS에 걸린다 */}
                <a
                  href={buildChatImageDownloadUrl(chatRoomId, image.messageId)}
                  aria-label={t("download")}
                  title={t("download")}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:text-primary"
                >
                  <DownloadIcon className="size-4" />
                </a>
              </div>
            </li>
          ))}
        </ul>

        {imagesQuery.hasNextPage ? (
          <button
            type="button"
            onClick={() => void imagesQuery.fetchNextPage()}
            disabled={imagesQuery.isFetchingNextPage}
            className="mt-5 w-full rounded-full border border-primary px-5 py-2.5 font-display text-sm font-bold text-primary transition-colors hover:bg-primary-soft disabled:opacity-60"
          >
            {imagesQuery.isFetchingNextPage ? t("loading") : t("loadMorePhotos")}
          </button>
        ) : null}
      </div>
    </dialog>
  );
}
