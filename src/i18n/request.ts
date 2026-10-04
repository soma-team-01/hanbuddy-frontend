import { getRequestConfig } from "next-intl/server";
import { joinChineseWordsInMessages } from "./chinese-word-joiner";
import { SERVICE_TIME_ZONE } from "./formats";
import { isLocale, routing } from "./routing";

const messageLoaders = {
  en: () => import("@/messages/en.json").then((module) => module.default),
  ko: () => import("@/messages/ko.json").then((module) => module.default),
  ja: () => import("@/messages/ja.json").then((module) => module.default),
  // 중국어는 단어 중간 줄바꿈을 막는 처리를 한 번만 하고 재사용한다(chinese-word-joiner.ts).
  "zh-Hans": memoize(() =>
    import("@/messages/zh-Hans.json").then((module) =>
      joinChineseWordsInMessages(module.default, "zh-Hans"),
    ),
  ),
  "zh-Hant": memoize(() =>
    import("@/messages/zh-Hant.json").then((module) =>
      joinChineseWordsInMessages(module.default, "zh-Hant"),
    ),
  ),
} as const;

function memoize<T>(load: () => Promise<T>) {
  let pending: Promise<T> | undefined;
  return () => (pending ??= load());
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;
  const locale = isLocale(requestedLocale) ? requestedLocale : routing.defaultLocale;

  return {
    locale,
    messages: await messageLoaders[locale](),
    timeZone: SERVICE_TIME_ZONE,
    formats: (await import("./formats")).formats,
  };
});
