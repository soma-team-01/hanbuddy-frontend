"use client";

import { useEffect, useRef } from "react";

/**
 * 목록 끝에 두는 감시 요소. 화면에 들어오면 다음 페이지를 불러온다.
 * IntersectionObserver가 없는 환경(jsdom 등)에서는 아무것도 하지 않으므로,
 * 호출부는 항상 키보드로 누를 수 있는 "더 보기" 버튼을 함께 둔다.
 */
export function useInfiniteScrollSentinel(onReachEnd: () => void, enabled: boolean) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onReachEnd);

  useEffect(() => {
    callbackRef.current = onReachEnd;
  });

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !enabled || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) callbackRef.current();
      },
      // 바닥에 닿기 전에 미리 채워 스크롤이 끊기지 않게 한다
      { rootMargin: "240px" },
    );
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [enabled]);

  return sentinelRef;
}
