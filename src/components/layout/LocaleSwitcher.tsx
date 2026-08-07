"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon, GlobeIcon } from "@/components/ui/icons";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const LOCALE_OPTIONS = [
  { code: "en", shortLabel: "EN", label: "English" },
  { code: "ko", shortLabel: "KO", label: "한국어" },
] as const satisfies ReadonlyArray<{
  code: Locale;
  shortLabel: string;
  label: string;
}>;

export function LocaleSwitcher({
  className,
  dismissMenu = false,
  onBeforeLocaleChange,
}: Readonly<{
  className?: string;
  dismissMenu?: boolean;
  onBeforeLocaleChange?: () => void;
}>) {
  const locale = useLocale();
  const t = useTranslations("Navigation");
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const currentOption =
    LOCALE_OPTIONS.find((option) => option.code === locale) ?? LOCALE_OPTIONS[0];

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const selectLocale = (nextLocale: Locale) => {
    setIsOpen(false);
    if (nextLocale !== locale) {
      onBeforeLocaleChange?.();
      router.replace(pathname, { locale: nextLocale });
    }
  };

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={t("selectLanguage", { language: currentOption.label })}
        onClick={() => setIsOpen((open) => !open)}
        className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line-soft bg-white px-4 text-sm font-bold text-ink shadow-[0_6px_18px_rgba(38,27,24,0.04)] transition-colors hover:border-primary hover:text-primary-strong focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${className ?? ""}`}
      >
        <GlobeIcon className="size-[18px]" />
        <span>{currentOption.shortLabel}</span>
        <ChevronDownIcon
          aria-hidden
          className={`size-3.5 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen ? (
        <div
          role="menu"
          aria-label={t("languageMenu")}
          className="absolute top-[calc(100%+10px)] right-0 z-50 min-w-48 overflow-hidden rounded-2xl border border-line-soft bg-white p-2 shadow-[0_18px_48px_rgba(38,27,24,0.14)]"
        >
          <p className="px-3 pt-2 pb-1 text-[11px] font-bold tracking-[0.16em] text-muted uppercase">
            {t("language")}
          </p>
          {LOCALE_OPTIONS.map((option) => {
            const isSelected = option.code === locale;
            return (
              <button
                key={option.code}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                aria-label={option.label}
                data-menu-dismiss={dismissMenu || undefined}
                onClick={() => selectLocale(option.code)}
                className={`flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-primary-soft/60 focus-visible:outline-2 focus-visible:outline-primary ${
                  isSelected ? "font-bold text-primary-strong" : "font-semibold text-ink"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className="w-6 text-xs font-bold text-muted">{option.shortLabel}</span>
                  <span>{option.label}</span>
                </span>
                {isSelected ? <CheckIcon aria-hidden className="size-4 text-primary" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
