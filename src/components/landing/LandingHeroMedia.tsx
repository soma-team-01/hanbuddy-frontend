import Image from "next/image";
import type { CSSProperties } from "react";

interface HeroMediaItem {
  readonly src: string;
  readonly alt: string;
}

interface LandingHeroMediaProps {
  readonly images: readonly HeroMediaItem[];
}

export function LandingHeroMedia({ images }: LandingHeroMediaProps) {
  return (
    <div aria-hidden="true" className="hero-media absolute inset-0 overflow-hidden">
      {images.map((image, index) => {
        const style = {
          "--hero-media-delay": `-${index * 5}s`,
        } as CSSProperties;

        return (
          <div key={image.src} className="hero-media-frame absolute inset-0" style={style}>
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority={index === 0}
              loading={index === 0 ? "eager" : "lazy"}
              sizes="100vw"
              className="hero-media-image object-cover"
            />
          </div>
        );
      })}
    </div>
  );
}
