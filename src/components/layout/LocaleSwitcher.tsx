"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon, ChevronRightIcon, GlobeIcon } from "@/components/ui/icons";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const LOCALE_OPTIONS = [
  { code: "en", shortLabel: "EN", label: "English" },
  { code: "ko", shortLabel: "KO", label: "한국어" },
  { code: "ja", shortLabel: "JA", label: "日本語" },
  { code: "zh-Hans", shortLabel: "简", label: "简体中文" },
  { code: "zh-Hant", shortLabel: "繁", label: "繁體中文" },
] as const satisfies ReadonlyArray<{
  code: Locale;
  shortLabel: string;
  label: string;
}>;

export function LocaleSwitcher({
  className,
  dismissMenu = false,
  labelStyle = "short",
  onBeforeLocaleChange,
  variant = "default",
}: Readonly<{
  className?: string;
  dismissMenu?: boolean;
  labelStyle?: "short" | "name" | "nameWithCode";
  onBeforeLocaleChange?: () => void;
  variant?: "accountMenu" | "default" | "footer";
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
  const currentLabel =
    labelStyle === "nameWithCode"
      ? `${currentOption.label}(${currentOption.code})`
      : labelStyle === "name"
        ? currentOption.label
        : currentOption.shortLabel;

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
      // usePathname은 쿼리를 뺀 경로만 준다 — ?scheduleId= 같은 파라미터가 유실되지 않게 붙여 준다
      const { search, hash } = window.location;
      router.replace(`${pathname}${search}${hash}`, { locale: nextLocale });
    }
  };

  return (
    <div
      ref={rootRef}
      className={
        variant === "accountMenu" ? "relative flex w-full flex-col" : "relative inline-flex"
      }
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={t("selectLanguage", { language: currentOption.label })}
        role={variant === "accountMenu" ? "menuitem" : undefined}
        onClick={() => setIsOpen((open) => !open)}
        className={`inline-flex cursor-pointer items-center gap-2 rounded-full transition-colors hover:text-primary-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          variant === "footer"
            ? "min-h-8 border border-transparent bg-transparent px-0 text-xs font-medium text-muted hover:border-transparent"
            : variant === "accountMenu"
              ? "min-h-11 w-full rounded-xl px-3 text-sm font-semibold text-ink hover:bg-primary-soft/60"
              : "min-h-11 border border-line-soft bg-white px-4 text-sm font-bold text-ink shadow-[0_6px_18px_rgba(38,27,24,0.04)] hover:border-primary focus-visible:border-primary"
        } ${className ?? ""}`}
      >
        <GlobeIcon className="size-[18px]" />
        {variant === "accountMenu" ? (
          <>
            <span className="flex-1 text-left">{t("language")}</span>
            <span className="text-xs font-medium text-muted">{currentOption.label}</span>
            <ChevronRightIcon
              aria-hidden
              className={`size-3.5 text-muted transition-transform ${isOpen ? "rotate-90" : ""}`}
            />
          </>
        ) : (
          <>
            <span>{currentLabel}</span>
            <ChevronDownIcon
              aria-hidden
              className={`size-3.5 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </>
        )}
      </button>

      {isOpen ? (
        <div
          role="menu"
          aria-label={t("languageMenu")}
          className={`right-0 z-50 min-w-44 overflow-hidden rounded-2xl border border-line-soft bg-white p-1.5 shadow-[0_18px_48px_rgba(38,27,24,0.14)] ${
            variant === "footer"
              ? "absolute bottom-[calc(100%+10px)]"
              : variant === "accountMenu"
                ? "relative mt-1 w-full"
                : "absolute top-[calc(100%+10px)]"
          }`}
        >
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
                className={`flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl px-3 py-2 text-left text-xs transition-colors hover:bg-primary-soft/60 focus-visible:outline-2 focus-visible:outline-primary ${
                  isSelected ? "font-semibold text-primary-strong" : "font-medium text-ink"
                }`}
              >
                <span className="flex items-center gap-3">
                  {labelStyle === "short" ? (
                    <>
                      <span className="w-6 text-xs font-bold text-muted">{option.shortLabel}</span>
                      <span>{option.label}</span>
                    </>
                  ) : (
                    <span>{`${option.label}(${option.code})`}</span>
                  )}
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
