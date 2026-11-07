"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { getLocaleOrDefault } from "@/i18n/routing";
import { getContentLanguage } from "@/lib/content-language";
import { haiBuddyLatestQueryOptions } from "@/lib/query/hai-buddy";
import type { HaiBuddyConversation } from "@/types/hai-buddy";
import { HaiBuddyPanel } from "./HaiBuddyPanel";

const OPEN_KEY = "hai-buddy-open";

const AvailabilityContext = createContext<{
  available: boolean;
  conversation?: HaiBuddyConversation;
}>({
  available: false,
});

const noopSubscribe = () => () => {};

/**
 * 하이드레이션 중에는 false, 끝나면 true. 최근 대화 조회가 페이지 일부의 하이드레이션보다 먼저 끝나도
 * 서버 HTML(런처 없음, 기존 연락 버튼 있음)과 어긋나지 않게 그 뒤에만 HAI Buddy를 켠다.
 */
function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/**
 * 로그인한 관광객·관리자에게만 켠다. 최근 대화 조회가 성공해야 런처를 보인다(서버에서 꺼져 있으면 404).
 */
export function HaiBuddyProvider({
  enabled,
  children,
}: Readonly<{ enabled: boolean; children: ReactNode }>) {
  const language = getContentLanguage(getLocaleOrDefault(useLocale()));
  const latest = useQuery({ ...haiBuddyLatestQueryOptions(language), enabled });
  const available = enabled && latest.isSuccess;
  return (
    <AvailabilityContext.Provider value={{ available, conversation: latest.data }}>
      {children}
    </AvailabilityContext.Provider>
  );
}

/** 활동 상세의 기존 연락 버튼처럼 같은 자리를 쓰는 요소가 HAI Buddy가 떠 있는지 알 때 쓴다. */
export function useHaiBuddyAvailable() {
  const hydrated = useHydrated();
  return useContext(AvailabilityContext).available && hydrated;
}

function readOpen() {
  try {
    return typeof window !== "undefined" && window.sessionStorage.getItem(OPEN_KEY) === "1";
  } catch {
    return false;
  }
}

function writeOpen(open: boolean) {
  try {
    if (open) window.sessionStorage.setItem(OPEN_KEY, "1");
    else window.sessionStorage.removeItem(OPEN_KEY);
  } catch {
    /* 열림 상태 기억은 편의 기능이라 저장소를 못 써도 그대로 둔다. */
  }
}

export function HaiBuddyLauncher() {
  const t = useTranslations("HaiBuddy");
  const hydrated = useHydrated();
  const { available: ready, conversation } = useContext(AvailabilityContext);
  const available = ready && hydrated;
  // 런처는 최근 대화 조회가 끝난 뒤(브라우저에서만) 그려지므로 저장된 열림 상태로 바로 시작해도 하이드레이션과 어긋나지 않는다.
  const [open, setOpen] = useState(readOpen);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);

  useEffect(() => {
    if (!open && returnFocus.current) {
      returnFocus.current = false;
      launcherRef.current?.focus();
    }
  }, [open]);

  if (!available) return null;

  function close() {
    returnFocus.current = true;
    writeOpen(false);
    setOpen(false);
  }

  return (
    <>
      {!open && (
        <button
          ref={launcherRef}
          type="button"
          title={t("launcher")}
          onClick={() => {
            writeOpen(true);
            setOpen(true);
          }}
          // 사람에게 묻는 문의하기(원형 말풍선)와 헷갈리지 않도록 글자가 있는 어두운 알약 모양으로, 그 위에 쌓아 둔다.
          className="fixed right-4 bottom-[calc(var(--fixed-bar-height,0px)+1.5rem+var(--contact-fab-space,0px))] z-30 flex h-12 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white shadow-lg ring-2 ring-primary/40 transition-colors hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:right-6"
        >
          <SparkleIcon />
          <span>{t("launcher")}</span>
        </button>
      )}
      {open && <HaiBuddyPanel initial={conversation} onClose={close} />}
    </>
  );
}

function SparkleIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5 text-[#FFC94D]" fill="currentColor">
      <path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9z" />
      <path d="M19 14l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9z" />
    </svg>
  );
}
