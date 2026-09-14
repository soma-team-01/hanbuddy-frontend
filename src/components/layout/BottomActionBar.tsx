"use client";

import { useRef } from "react";
import { useFixedBarHeight } from "@/lib/layout/use-fixed-bar-height";

/** 모바일에서는 화면 하단에 고정되고 lg 이상에서는 본문 흐름으로 돌아오는 액션 바. 높이를 `--fixed-bar-height`로 노출한다. */
export function BottomActionBar({ children }: Readonly<{ children: React.ReactNode }>) {
  const ref = useRef<HTMLDivElement>(null);
  useFixedBarHeight(ref);

  return (
    <div
      ref={ref}
      data-testid="bottom-action-bar"
      className="fixed inset-x-0 bottom-0 z-30 flex w-full items-center gap-3 border-t border-line-soft bg-canvas-soft px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(61,45,43,0.08)] lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none"
    >
      {children}
    </div>
  );
}
