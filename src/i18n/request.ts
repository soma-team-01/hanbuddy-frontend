import { getRequestConfig } from "next-intl/server";
import { SERVICE_TIME_ZONE } from "./formats";
import { isLocale, routing } from "./routing";

const messageLoaders = {
  en: () => import("@/messages/en.json").then((module) => module.default),
  ko: () => import("@/messages/ko.json").then((module) => module.default),
  ja: () => import("@/messages/ja.json").then((module) => module.default),
  "zh-Hans": () => import("@/messages/zh-Hans.json").then((module) => module.default),
  "zh-Hant": () => import("@/messages/zh-Hant.json").then((module) => module.default),
} as const;

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
