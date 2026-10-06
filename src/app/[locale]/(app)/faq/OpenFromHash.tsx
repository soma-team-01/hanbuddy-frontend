"use client";

import { useEffect } from "react";

function openDetails(rawId: string) {
  let id: string;
  try {
    id = decodeURIComponent(rawId);
  } catch {
    // /faq#% 처럼 잘못 인코딩된 주소는 무시한다
    return;
  }
  if (!id) return;
  const target = document.getElementById(id);
  if (target instanceof HTMLDetailsElement) target.open = true;
}

// 메인의 질문 바로가기(/faq#faq-pay)나 목차에서 질문을 고르면, 접혀 있던 그 답을 열어 둔다.
// 일부 브라우저만 주소의 #으로 <details>를 자동으로 열어 주므로 직접 연다.
// 같은 질문을 다시 고르면 해시가 바뀌지 않아 hashchange가 없으므로 링크 클릭도 함께 본다.
export function OpenFromHash() {
  useEffect(() => {
    const onHashChange = () => openDetails(window.location.hash.slice(1));
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href^='#']");
      if (link) openDetails(link.getAttribute("href")!.slice(1));
    };
    onHashChange();
    window.addEventListener("hashchange", onHashChange);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      document.removeEventListener("click", onClick);
    };
  }, []);

  return null;
}
