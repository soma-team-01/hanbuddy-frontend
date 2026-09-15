import Image from "next/image";
import type { CSSProperties } from "react";

export type HeroMediaFit = "cover" | "contain";

interface HeroMediaItem {
  readonly src: string;
  readonly alt: string;
  /** cover: 항상 꽉 채움. contain: md 이상에서 흐린 배경 위에 원본을 가운데 잘리지 않게 놓는다(셀카·크루 사진). */
  readonly fit?: HeroMediaFit;
  /**
   * 사진 초점(object-position). cover 사진은 모든 폭에서, contain 사진은 모바일 띠에서만 쓰이고
   * md 이상에서는 흐린 배경 위 정중앙에 놓인다.
   */
  readonly position?: string;
}

interface LandingHeroMediaProps {
  readonly images: readonly HeroMediaItem[];
}

/**
 * 히어로 배경 사진 시퀀스. 모바일(<768px)에서는 히어로 상단의 사진 띠(400px)로,
 * md 이상에서는 섹션 전체를 덮는 배경으로 렌더링한다.
 */
export function LandingHeroMedia({ images }: LandingHeroMediaProps) {
  return (
    <div
      aria-hidden="true"
      className="hero-media relative h-[400px] w-full overflow-hidden md:absolute md:inset-0 md:h-auto"
    >
      {images.map((image, index) => {
        const style = {
          "--hero-media-delay": `${index * 5}s`,
        } as CSSProperties;
        const isContain = image.fit === "contain";

        return (
          <div key={image.src} className="hero-media-frame absolute inset-0" style={style}>
            {isContain ? (
              <Image
                src={image.src}
                alt=""
                fill
                loading="lazy"
                sizes="50vw"
                className="hero-media-backdrop hidden scale-110 object-cover blur-2xl brightness-50 md:block"
              />
            ) : null}
            {/* contain 사진은 md 이상에서 히어로 높이의 82%로 줄여 흐린 배경 가운데에 놓는다 */}
            <div className={`absolute inset-0 ${isContain ? "md:inset-y-[9%]" : ""}`}>
              <Image
                src={image.src}
                alt={image.alt}
                fill
                priority={index === 0}
                loading={index === 0 ? "eager" : "lazy"}
                sizes="100vw"
                className={`hero-media-image object-cover ${
                  isContain ? "hero-media-contain md:object-contain" : ""
                }`}
                style={
                  image.position
                    ? ({ "--hero-media-position": image.position } as CSSProperties)
                    : undefined
                }
              />
            </div>
          </div>
        );
      })}
      {/* 모바일: 사진 띠가 아래 어두운 글자 영역으로 녹아든다 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink md:hidden" />
    </div>
  );
}
