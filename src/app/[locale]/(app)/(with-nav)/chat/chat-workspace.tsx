"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChatRoomList } from "@/components/chat/ChatRoomList";
import { PageContainer } from "@/components/layout/PageContainer";
import { usePathname } from "@/i18n/navigation";

/**
 * 채팅 작업 공간. 데스크톱은 목록 + 대화 2열, 모바일은 한 번에 하나만 보여준다.
 * 목록을 레이아웃에 두어 방을 오갈 때 다시 불러오지 않는다.
 */
export function ChatWorkspace({ children }: Readonly<{ children: ReactNode }>) {
  const t = useTranslations("Chat");
  const pathname = usePathname() ?? "";
  const roomOpen = /^\/chat\/[^/]+$/.test(pathname);

  return (
    <PageContainer className="flex-1 py-4 md:py-8">
      <main className="flex h-[calc(100dvh-9rem)] min-h-[26rem] overflow-hidden rounded-3xl border border-line-soft bg-canvas-soft shadow-[0_8px_22px_rgba(61,45,43,0.06)]">
        <section
          aria-label={t("title")}
          className={`w-full shrink-0 overflow-y-auto border-line-soft lg:block lg:w-80 lg:border-r ${
            roomOpen ? "hidden" : "block"
          }`}
        >
          <ChatRoomList />
        </section>
        <section className={`min-w-0 flex-1 ${roomOpen ? "block" : "hidden lg:block"}`}>
          {children}
        </section>
      </main>
    </PageContainer>
  );
}
