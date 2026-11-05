import { StaticImage } from "@/components/ui/StaticImage";
import type { CSSProperties } from "react";

interface HeroMediaItem {
  readonly src: string;
  readonly alt: string;
  /**
   * PC(lg 이상) 사진 칸의 초점(object-position). 칸이 정사각형에 가까워 4:3 사진의 좌우가 잘리므로
   * 얼굴이 남도록 사진마다 잡는다. 모바일·태블릿은 원본 전체를 가운데에 둔다.
   */
  readonly position?: string;
}

const SLIDE_SECONDS = 5;

interface LandingHeroMediaProps {
  readonly images: readonly HeroMediaItem[];
}

/**
 * 히어로 배경 사진 시퀀스.
 * 모바일·태블릿은 상단에 축소한 원본과 흐린 배경, PC(lg 이상)는 오른쪽 절반을 사진으로 꽉 채운다.
 */
export function LandingHeroMedia({ images }: LandingHeroMediaProps) {
  return (
    <div
      aria-hidden="true"
      className="hero-media absolute inset-0 w-full overflow-hidden lg:left-1/2 lg:w-auto"
    >
      {images.map((image, index) => {
        // 한 장당 5초. 전체 주기는 장수에 비례한다 (키프레임 비율은 globals.css 참고)
        const style = {
          "--hero-media-delay": `${index * SLIDE_SECONDS}s`,
          "--hero-media-duration": `${images.length * SLIDE_SECONDS}s`,
        } as CSSProperties;

        return (
          <div key={image.src} className="hero-media-frame absolute inset-0" style={style}>
            <StaticImage
              src={image.src}
              alt=""
              fill
              loading="lazy"
              sizes="50vw"
              className="hero-media-backdrop scale-110 object-cover blur-2xl brightness-50 lg:hidden"
            />
            <div className="absolute inset-x-0 top-0 aspect-[4/3] lg:inset-0 lg:aspect-auto lg:h-auto">
              <StaticImage
                src={image.src}
                alt={image.alt}
                fill
                // 첫 장이 첫 화면의 가장 큰 요소(LCP)라 먼저 받는다. Next 16 권장대로 preload 대신 fetchPriority를 쓴다.
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : undefined}
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="hero-media-image object-contain lg:object-cover"
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
    </div>
  );
}
