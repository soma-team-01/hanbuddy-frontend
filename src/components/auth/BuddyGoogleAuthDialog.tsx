"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRightIcon, XIcon } from "@/components/ui/icons";
import { getLocaleOrDefault } from "@/i18n/routing";
import { getPolicyPath } from "@/lib/policy-routes";
import { LoginMethods } from "./LoginMethods";

interface BuddyGoogleAuthDialogProps {
  variant?: "primary" | "inverse" | "header";
}

const TRIGGER_CLASS_NAMES = {
  primary:
    "motion-press inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-7 font-display text-sm font-bold text-on-primary shadow-[0_14px_30px_rgba(209,63,50,0.35)] transition-colors hover:bg-primary-hover",
  inverse:
    "motion-press mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 font-display text-sm font-bold text-primary-strong shadow-[0_12px_28px_rgba(84,24,18,0.2)] transition-colors hover:bg-primary-soft",
  header:
    "inline-flex min-h-11 items-center justify-center rounded-full border border-line-strong bg-canvas-soft px-6 text-sm font-bold text-ink transition-colors hover:border-primary hover:text-primary-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
} as const;

export function BuddyGoogleAuthDialog({
  variant = "primary",
}: Readonly<BuddyGoogleAuthDialogProps>) {
  const locale = getLocaleOrDefault(useLocale());
  const t = useTranslations("BuddyAuth");
  const authT = useTranslations("Auth");
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), a[href], input:not([disabled])",
        ),
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [isOpen]);

  const triggerClassName = TRIGGER_CLASS_NAMES[variant];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        className={triggerClassName}
      >
        {variant === "header" ? t("loginTrigger") : t("trigger")}
        {variant === "header" ? null : <ArrowRightIcon className="ml-2 size-4" />}
      </button>
      {isOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/70 p-4 backdrop-blur-[2px]"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setIsOpen(false);
              }}
            >
              <section
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative max-h-[90dvh] w-full max-w-[440px] overflow-y-auto rounded-3xl bg-canvas-soft px-6 pt-12 pb-6 text-center shadow-2xl sm:px-8 sm:pb-8"
              >
                <button
                  ref={closeRef}
                  type="button"
                  aria-label={t("close")}
                  onClick={() => setIsOpen(false)}
                  className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-primary-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <XIcon className="size-5" />
                </button>
                <p className="font-display text-xs font-bold tracking-[0.24em] text-primary uppercase">
                  {t("eyebrow")}
                </p>
                <h2
                  id={titleId}
                  className="mt-3 font-display text-2xl font-bold tracking-tight text-balance text-ink"
                >
                  {t("title")}
                </h2>
                <p className="mt-3 mb-6 text-sm leading-6 text-muted">{t("description")}</p>
                <LoginMethods
                  locale={locale}
                  buddy
                  googleHref={`/api/auth/google/start?locale=${locale}&intent=buddy`}
                />
                <p className="mt-5 border-t border-line-soft pt-5 text-xs leading-5 text-muted">
                  {authT("legalNoticeStart")}{" "}
                  <Link
                    href={getPolicyPath(locale, "terms-of-service")}
                    className="font-semibold text-primary underline underline-offset-2"
                  >
                    {authT("termsOfService")}
                  </Link>{" "}
                  {authT("legalNoticeMiddle")}{" "}
                  <Link
                    href={getPolicyPath(locale, "privacy-policy")}
                    className="font-semibold text-primary underline underline-offset-2"
                  >
                    {authT("privacyPolicy")}
                  </Link>
                  {authT("legalNoticeEnd")}
                </p>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
