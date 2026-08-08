"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeftIcon, ArrowRightIcon, XIcon } from "@/components/ui/icons";

/** 활동 사진을 전체 화면으로 넘겨 볼 수 있는 갤러리 오버레이 */
export function PhotoGalleryDialog({
  images,
  alt,
  initialIndex = 0,
  unoptimizedImages = false,
  onClose,
}: Readonly<{
  images: string[];
  alt: string;
  initialIndex?: number;
  /** blob 미리보기 등 next/image 최적화를 탈 수 없는 소스일 때 */
  unoptimizedImages?: boolean;
  onClose: () => void;
}>) {
  const t = useTranslations("ActivityDetail");
  const tAccessibility = useTranslations("Accessibility");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(() =>
    Math.min(Math.max(initialIndex, 0), Math.max(images.length - 1, 0)),
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  if (images.length === 0) return null;

  // 다이얼로그가 열린 채로 images가 짧아져도 범위를 벗어나지 않게 렌더 시점에 클램프한다
  const safeIndex = Math.min(index, images.length - 1);
  const showPrevious = () => setIndex((safeIndex - 1 + images.length) % images.length);
  const showNext = () => setIndex((safeIndex + 1) % images.length);

  return (
    <dialog
      ref={dialogRef}
      aria-label={alt}
      onClose={onClose}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") showPrevious();
        if (event.key === "ArrowRight") showNext();
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 backdrop:bg-ink/95"
    >
      <div className="relative flex h-full w-full flex-col">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="rounded-full bg-ink/60 px-3 py-1 font-display text-sm font-bold text-white">
            {t("photoCounter", { current: safeIndex + 1, total: images.length })}
          </span>
          <button
            type="button"
            aria-label={tAccessibility("closeDialog")}
            onClick={onClose}
            className="flex size-11 items-center justify-center rounded-full bg-ink/60 text-white transition-colors hover:bg-ink/80"
          >
            <XIcon className="size-5" />
          </button>
        </div>
        <div className="relative min-h-0 flex-1">
          <Image
            src={images[safeIndex]}
            alt={alt}
            fill
            sizes="100vw"
            unoptimized={unoptimizedImages}
            className="object-contain"
          />
        </div>
        {images.length > 1 ? (
          <>
            <button
              type="button"
              aria-label={t("previousPhoto")}
              onClick={showPrevious}
              className="absolute top-1/2 left-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-ink/60 text-white transition-colors hover:bg-ink/80"
            >
              <ArrowLeftIcon className="size-5" />
            </button>
            <button
              type="button"
              aria-label={t("nextPhoto")}
              onClick={showNext}
              className="absolute top-1/2 right-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-ink/60 text-white transition-colors hover:bg-ink/80"
            >
              <ArrowRightIcon className="size-5" />
            </button>
          </>
        ) : null}
        <div className="pb-[max(1rem,env(safe-area-inset-bottom))]" />
      </div>
    </dialog>
  );
}
