"use client";

import { useTransition, type ChangeEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { ChevronRightIcon, GlobeIcon } from "@/components/ui/icons";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const LANGUAGE_OPTIONS = [
  { locale: "en", messageKey: "english" },
  { locale: "ko", messageKey: "korean" },
] as const satisfies ReadonlyArray<{
  locale: Locale;
  messageKey: "english" | "korean";
}>;

function buildLocaleSwitchHref(pathname: string, query: string, hash: string) {
  const search = query ? "?" + query : "";
  return pathname + search + hash;
}

export function LanguagePreference() {
  const t = useTranslations("MyPage");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function selectLocale(nextLocale: Locale) {
    if (isPending) return;
    if (nextLocale === locale) return;

    const query = searchParams.toString();
    const href = buildLocaleSwitchHref(pathname, query, window.location.hash);

    startTransition(() => {
      router.replace(href, { locale: nextLocale });
    });
  }

  function handleLocaleChange(event: ChangeEvent<HTMLSelectElement>) {
    selectLocale(event.currentTarget.value as Locale);
  }

  return (
    <label className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 transition-colors hover:bg-chip">
      <GlobeIcon className="size-5 text-ink" />
      <span className="flex-1 text-base text-ink">{t("language")}</span>
      <span className="relative flex items-center">
        <select
          aria-label={t("language")}
          value={locale}
          disabled={isPending}
          onChange={handleLocaleChange}
          className="cursor-pointer appearance-none bg-transparent py-1 pr-6 text-sm text-ink-soft outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.locale} value={option.locale}>
              {t(option.messageKey)}
            </option>
          ))}
        </select>
        <ChevronRightIcon className="pointer-events-none absolute right-0 size-4 rotate-90 text-ink-soft" />
      </span>
    </label>
  );
}
