"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChatListMenu } from "@/components/chat/ChatListMenu";
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
    // 전역 헤더(76px)를 뺀 높이를 채워 첫 화면에 대화가 통째로 들어오게 한다.
    // 푸터는 그 아래에 남아 있어 스크롤하면 볼 수 있다.
    <PageContainer className="h-[calc(100dvh-76px)] py-3 md:py-5">
      <main className="flex h-full overflow-hidden rounded-3xl border border-line-soft bg-canvas-soft shadow-[0_8px_22px_rgba(61,45,43,0.06)]">
        <section
          aria-label={t("title")}
          className={`flex w-full shrink-0 flex-col border-line-soft lg:flex lg:w-80 lg:border-r ${
            roomOpen ? "hidden" : "flex"
          }`}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line-soft px-4 py-3">
            <h1 className="font-display text-base font-bold text-ink">{t("title")}</h1>
            <ChatListMenu />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ChatRoomList />
          </div>
        </section>
        <section className={`min-w-0 flex-1 ${roomOpen ? "block" : "hidden lg:block"}`}>
          {children}
        </section>
      </main>
    </PageContainer>
  );
}
