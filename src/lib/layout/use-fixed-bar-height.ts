"use client";

import { useEffect, type RefObject } from "react";

export const FIXED_BAR_HEIGHT_VAR = "--fixed-bar-height";
const BODY_FLAG = "fixedBar";

/**
 * 화면 하단 고정 바의 실제 높이를 `--fixed-bar-height` CSS 변수로 노출한다.
 * 본문·푸터가 이 변수만큼 하단 여백을 주면 고정 바에 가려지는 콘텐츠가 사라진다.
 * 바가 `position: static`(데스크톱)이면 0px을 쓰고 body 표식을 지운다.
 */
export function useFixedBarHeight(ref: RefObject<HTMLElement | null>, enabled = true) {
  useEffect(() => {
    const element = ref.current;
    const root = document.documentElement;
    if (!enabled || !element) return;

    const update = () => {
      const isStatic = getComputedStyle(element).position === "static";
      root.style.setProperty(FIXED_BAR_HEIGHT_VAR, isStatic ? "0px" : `${element.offsetHeight}px`);
      if (isStatic) delete document.body.dataset[BODY_FLAG];
      else document.body.dataset[BODY_FLAG] = "true";
    };

    update();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(element);
    window.addEventListener("resize", update);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
      root.style.removeProperty(FIXED_BAR_HEIGHT_VAR);
      delete document.body.dataset[BODY_FLAG];
    };
  }, [ref, enabled]);
}
