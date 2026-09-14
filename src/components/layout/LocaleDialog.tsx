"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { CheckIcon, GlobeIcon, XIcon } from "@/components/ui/icons";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { LOCALE_OPTIONS } from "./LocaleSwitcher";

export function LocaleDialog({ onClose }: Readonly<{ onClose: () => void }>) {
  const locale = useLocale();
  const t = useTranslations("Navigation");
  const tAccessibility = useTranslations("Accessibility");
  const pathname = usePathname();
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const selectLocale = (nextLocale: Locale) => {
    dialogRef.current?.close();
    if (nextLocale === locale) return;

    const { search, hash } = window.location;
    router.replace(`${pathname}${search}${hash}`, { locale: nextLocale });
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="locale-dialog-title"
      aria-describedby="locale-dialog-description"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        dialogRef.current?.close();
      }}
      className="motion-dialog m-0 max-h-[min(82dvh,44rem)] w-full max-w-none overflow-y-auto rounded-t-3xl border-0 bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/45 backdrop:backdrop-blur-[3px] max-md:mt-auto md:m-auto md:w-[calc(100%-3rem)] md:max-w-2xl md:rounded-[2rem]"
    >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line-soft bg-white px-6 py-5 md:px-8 md:py-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-strong">
            <GlobeIcon className="size-5" />
          </span>
          <div>
            <h2 id="locale-dialog-title" className="font-display text-xl font-bold text-ink">
              {t("language")}
            </h2>
            <p id="locale-dialog-description" className="mt-1 text-sm text-muted">
              {t("languageDialogDescription")}
            </p>
          </div>
        </div>
        <button
          type="button"
          autoFocus
          aria-label={tAccessibility("closeDialog")}
          onClick={() => dialogRef.current?.close()}
          className="-mt-1 -mr-2 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-primary-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
        >
          <XIcon className="size-5" />
        </button>
      </div>

      <div
        role="radiogroup"
        aria-label={t("languageMenu")}
        className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 md:p-6"
      >
        {LOCALE_OPTIONS.map((option) => {
          const isSelected = option.code === locale;
          return (
            <button
              key={option.code}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={option.label}
              onClick={() => selectLocale(option.code)}
              className={`group flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                isSelected
                  ? "border-primary bg-primary-soft/70 text-primary-strong"
                  : "border-transparent text-ink hover:border-line-soft hover:bg-panel-raised"
              }`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isSelected ? "bg-white text-primary-strong" : "bg-panel text-muted"
                  }`}
                >
                  {option.shortLabel}
                </span>
                <span className="font-display text-sm font-semibold">{option.label}</span>
              </span>
              {isSelected ? (
                <CheckIcon aria-hidden className="size-5 shrink-0 text-primary" />
              ) : null}
            </button>
          );
        })}
      </div>
    </dialog>
  );
}
