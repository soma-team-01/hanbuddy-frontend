"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 화면 가까이 왔을 때만 Google Maps iframe을 붙인다.
 * iframe의 loading="lazy"만으로는 크롬이 화면 밖 1~2천 px 거리에서 미리 불러와(약 450KB) 첫 화면 속도를 늦춘다.
 * 자리를 같은 크기로 먼저 잡아 두어 지도가 들어와도 레이아웃이 밀리지 않는다.
 */
export function LazyMapFrame({
  src,
  title,
  className,
  rootMargin = "200px",
}: Readonly<{ src: string; title: string; className: string; rootMargin?: string }>) {
  const placeholderRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = placeholderRef.current;
    if (visible || !element) return;
    if (typeof IntersectionObserver === "undefined") {
      // 화면 감지를 못 하는 브라우저는 바로 지도를 붙인다.
      let active = true;
      queueMicrotask(() => {
        if (active) setVisible(true);
      });
      return () => {
        active = false;
      };
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin, visible]);

  if (!visible) {
    return (
      <div
        ref={placeholderRef}
        data-testid="map-placeholder"
        aria-hidden
        className={`${className} bg-line-soft/60`}
      />
    );
  }

  return (
    <iframe
      title={title}
      src={src}
      className={className}
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
    />
  );
}
