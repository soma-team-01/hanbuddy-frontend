"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import { getLocaleOrDefault } from "@/i18n/routing";
import { getContentLanguage } from "@/lib/content-language";
import type { HaiBuddyContext, HaiBuddyPage } from "@/types/hai-buddy";

const PAGE_PREFIXES: ReadonlyArray<[string, HaiBuddyPage]> = [
  ["/applications", "APPLICATIONS"],
  ["/explore", "EXPLORE"],
  ["/faq", "FAQ"],
  ["/about", "ABOUT"],
  ["/tips", "TIPS"],
  ["/policies", "POLICY"],
  ["/chat", "CHAT"],
  ["/my-page", "MY_PAGE"],
];

function positiveId(value: string | null | undefined): number | undefined {
  return value && /^\d+$/.test(value) ? Number(value) : undefined;
}

/** 로케일을 뗀 경로와 쿼리로 HAI Buddy에 보낼 화면 맥락을 만든다. id는 서버가 다시 확인한다. */
export function resolveHaiBuddyContext(
  pathname: string,
  searchParams: URLSearchParams,
  locale: string,
): HaiBuddyContext {
  const base = {
    language: getContentLanguage(getLocaleOrDefault(locale)),
    locale: getLocaleOrDefault(locale),
  };
  const activity = /^\/activities\/([^/]+)(\/book)?\/?$/.exec(pathname);
  if (activity) {
    const activityId = positiveId(activity[1]);
    if (activity[2]) {
      const scheduleId = positiveId(searchParams.get("scheduleId"));
      return {
        page: "BOOKING",
        ...(activityId && { activityId }),
        ...(scheduleId && { scheduleId }),
        ...base,
      };
    }
    return { page: "ACTIVITY_DETAIL", ...(activityId && { activityId }), ...base };
  }
  if (pathname === "/" || pathname === "") return { page: "HOME", ...base };
  const match = PAGE_PREFIXES.find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return { page: match ? match[1] : "OTHER", ...base };
}

export function useHaiBuddyContext(): HaiBuddyContext {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const locale = useLocale();
  const search = searchParams?.toString() ?? "";
  return useMemo(
    () => resolveHaiBuddyContext(pathname, new URLSearchParams(search), locale),
    [pathname, search, locale],
  );
}
