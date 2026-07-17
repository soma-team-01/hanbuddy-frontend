"use client";

import { useEffect, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { CheckIcon, ChevronRightIcon, GlobeIcon } from "@/components/ui/icons";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const LANGUAGE_OPTIONS = [
  { locale: "en", messageKey: "english" },
  { locale: "ko", messageKey: "korean" },
] as const satisfies ReadonlyArray<{
  locale: Locale;
  messageKey: "english" | "korean";
}>;

export function LanguagePreference() {
  const t = useTranslations("MyPage");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const currentOptionIndex = LANGUAGE_OPTIONS.findIndex((option) => option.locale === locale);
  const currentOption = LANGUAGE_OPTIONS[currentOptionIndex]!;

  useEffect(() => {
    if (!isOpen) return;
    optionRefs.current[currentOptionIndex]?.focus();
  }, [currentOptionIndex, isOpen]);

  function closeDropdown() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function selectLocale(nextLocale: Locale) {
    if (isPending) return;

    if (nextLocale === locale) {
      closeDropdown();
      return;
    }

    const query = searchParams.toString();
    const href = `${pathname}${query ? `?${query}` : ""}${window.location.hash}`;

    startTransition(() => {
      router.replace(href, { locale: nextLocale });
    });
    closeDropdown();
  }

  function handleOptionKeyDown(event: KeyboardEvent<HTMLButtonElement>, optionIndex: number) {
    let offset: -1 | 1;

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      offset = 1;
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      offset = -1;
    } else {
      return;
    }

    event.preventDefault();
    const nextIndex = (optionIndex + offset + LANGUAGE_OPTIONS.length) % LANGUAGE_OPTIONS.length;
    optionRefs.current[nextIndex]?.focus();
    selectLocale(LANGUAGE_OPTIONS[nextIndex]!.locale);
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? "language-preference-options" : undefined}
        onClick={() => {
          if (isOpen) {
            closeDropdown();
          } else {
            setIsOpen(true);
          }
        }}
        className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-chip"
      >
        <GlobeIcon className="size-5 text-ink" />
        <span className="flex-1 text-base text-ink">{t("language")}</span>
        <span className="text-sm text-ink-soft">{t(currentOption.messageKey)}</span>
        <ChevronRightIcon
          className={`size-4 text-ink-soft transition-transform ${isOpen ? "rotate-90" : ""}`}
        />
      </button>

      {isOpen ? (
        <div
          id="language-preference-options"
          role="listbox"
          aria-label={t("languageSheetTitle")}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            closeDropdown();
          }}
          className="absolute top-[calc(100%-0.25rem)] right-4 z-20 flex w-40 flex-col rounded-xl border border-line bg-white p-1.5 text-ink shadow-lg"
        >
          {LANGUAGE_OPTIONS.map((option, index) => {
            const isSelected = option.locale === locale;

            return (
              <button
                key={option.locale}
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                type="button"
                role="option"
                aria-selected={isSelected}
                tabIndex={isSelected ? 0 : -1}
                disabled={isPending}
                onClick={() => selectLocale(option.locale)}
                onKeyDown={(event) => handleOptionKeyDown(event, index)}
                className="flex min-h-10 items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-ink transition-colors enabled:hover:bg-chip disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>{t(option.messageKey)}</span>
                {isSelected ? <CheckIcon className="size-4 text-forest" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
