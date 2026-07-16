"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { CheckIcon, ChevronRightIcon, GlobeIcon, XIcon } from "@/components/ui/icons";
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
  const tAccessibility = useTranslations("Accessibility");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const selectedOptionRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const currentOption = LANGUAGE_OPTIONS.find((option) => option.locale === locale)!;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog || dialog.open) return;

    dialog.showModal();
    selectedOptionRef.current?.focus();
  }, [isOpen]);

  function handleDialogClose() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function closeDialog() {
    const dialog = dialogRef.current;
    if (dialog?.open) {
      dialog.close();
    } else {
      handleDialogClose();
    }
  }

  function selectLocale(nextLocale: Locale) {
    if (isPending) return;

    if (nextLocale === locale) {
      closeDialog();
      return;
    }

    const query = searchParams.toString();
    const href = `${pathname}${query ? `?${query}` : ""}${window.location.hash}`;

    startTransition(() => {
      router.replace(href, { locale: nextLocale });
    });
    closeDialog();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex cursor-pointer items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-chip"
      >
        <GlobeIcon className="size-5 text-ink" />
        <span className="flex-1 text-base text-ink">{t("language")}</span>
        <span className="text-sm text-ink-soft">{t(currentOption.messageKey)}</span>
        <ChevronRightIcon className="size-4 text-ink-soft" />
      </button>

      {isOpen ? (
        <dialog
          ref={dialogRef}
          aria-labelledby="language-preference-title"
          aria-modal="true"
          onClose={handleDialogClose}
          onCancel={(event) => {
            event.preventDefault();
            if (!isPending) closeDialog();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget && !isPending) closeDialog();
          }}
          className="motion-dialog m-0 mt-auto w-full max-w-md rounded-t-3xl border-0 bg-cream p-0 text-ink shadow-xl backdrop:bg-black/30 backdrop:backdrop-blur-[2px]"
        >
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2
              id="language-preference-title"
              className="font-display text-xl font-semibold text-forest"
            >
              {t("languageSheetTitle")}
            </h2>
            <button
              type="button"
              aria-label={tAccessibility("closeDialog")}
              onClick={closeDialog}
              disabled={isPending}
              className="flex size-10 items-center justify-center rounded-full text-ink-soft transition-colors enabled:hover:bg-chip enabled:hover:text-ink disabled:opacity-60"
            >
              <XIcon className="size-5" />
            </button>
          </div>

          <div
            role="radiogroup"
            aria-label={t("languageSheetTitle")}
            className="flex flex-col px-4 py-3"
          >
            {LANGUAGE_OPTIONS.map((option) => {
              const isSelected = option.locale === locale;

              return (
                <button
                  key={option.locale}
                  ref={isSelected ? selectedOptionRef : undefined}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={isPending}
                  onClick={() => selectLocale(option.locale)}
                  className="flex min-h-14 items-center justify-between rounded-2xl px-4 py-3 text-left text-base text-ink transition-colors enabled:hover:bg-chip disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>{t(option.messageKey)}</span>
                  {isSelected ? <CheckIcon className="size-5 text-forest" /> : null}
                </button>
              );
            })}
          </div>
        </dialog>
      ) : null}
    </>
  );
}
