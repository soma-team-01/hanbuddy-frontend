"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ImagesIcon } from "@/components/ui/icons";

/** 세로가 지나치게 긴 사진이 대화를 덮지 않도록 비율을 제한한다 */
const MIN_ASPECT_RATIO = 0.6;
const MAX_ASPECT_RATIO = 2.2;
const DEFAULT_ASPECT_RATIO = 4 / 3;

function resolveAspectRatio(width?: number | null, height?: number | null) {
  if (!width || !height || width <= 0 || height <= 0) return DEFAULT_ASPECT_RATIO;

  return Math.min(Math.max(width / height, MIN_ASPECT_RATIO), MAX_ASPECT_RATIO);
}

/**
 * 대화의 사진 한 장.
 * 자리를 먼저 잡아 두어 불러오는 동안이나 실패했을 때도 말풍선이 찌그러지지 않게 한다.
 */
export function ChatPhoto({
  imageUrl,
  alt,
  imageWidth,
  imageHeight,
  stretch = false,
  sizes,
}: Readonly<{
  imageUrl: string;
  alt: string;
  imageWidth?: number | null;
  imageHeight?: number | null;
  /** 줄 높이가 정해진 격자 칸처럼, 부모가 준 상자를 그대로 채울 때 */
  stretch?: boolean;
  sizes: string;
}>) {
  const t = useTranslations("Chat");
  const [failed, setFailed] = useState(false);
  const aspectRatio = stretch ? undefined : resolveAspectRatio(imageWidth, imageHeight);

  if (failed) {
    return (
      <span
        style={{ aspectRatio }}
        className={`flex w-full flex-col items-center justify-center gap-1 bg-panel text-muted ${
          stretch ? "h-full" : ""
        }`}
      >
        <ImagesIcon className="size-5" />
        <span className="px-2 text-center text-[11px] leading-4">{t("photoUnavailable")}</span>
      </span>
    );
  }

  return (
    <span
      style={{ aspectRatio }}
      className={`relative block w-full bg-panel ${stretch ? "h-full" : ""}`}
    >
      <Image
        src={imageUrl}
        alt={alt}
        fill
        sizes={sizes}
        onError={() => setFailed(true)}
        className="object-cover"
      />
    </span>
  );
}
