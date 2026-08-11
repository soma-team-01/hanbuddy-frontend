"use client";

import { useCallback } from "react";
import { useRouter } from "@/i18n/navigation";

/**
 * 브라우저 히스토리가 있으면 이전 화면으로 돌아가고, 없으면 지정한 경로로 이동한다.
 * 같은 상세 화면이라도 탐색·내 신청 등 진입 경로가 달라 고정 링크로는 되돌릴 수 없다.
 */
export function useHistoryBack(fallbackHref: string) {
  const router = useRouter();

  return useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  }, [fallbackHref, router]);
}
