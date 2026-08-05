"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRightIcon, GoogleIcon, XIcon } from "@/components/ui/icons";

interface BuddyGoogleAuthDialogProps {
  variant?: "primary" | "inverse";
}

export function BuddyGoogleAuthDialog({
  variant = "primary",
}: Readonly<BuddyGoogleAuthDialogProps>) {
  const locale = useLocale();
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
        dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]"),
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

  const triggerClassName =
    variant === "inverse"
      ? "motion-press mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 font-display text-sm font-bold text-primary-strong shadow-[0_12px_28px_rgba(84,24,18,0.2)] transition-colors hover:bg-primary-soft"
      : "motion-press inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-7 font-display text-sm font-bold text-on-primary shadow-[0_14px_30px_rgba(209,63,50,0.35)] transition-colors hover:bg-primary-hover";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        className={triggerClassName}
      >
        {t("trigger")}
        <ArrowRightIcon className="ml-2 size-4" />
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
                className="relative w-full max-w-[480px] rounded-[2rem] bg-canvas-soft px-6 py-8 text-center shadow-[0_28px_90px_rgba(38,27,24,0.3)] sm:px-9 sm:py-10"
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
                  className="mt-3 font-display text-2xl font-extrabold tracking-[-0.035em] text-ink sm:text-3xl"
                >
                  {t("title")}
                </h2>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted sm:text-base">
                  {t("description")}
                </p>
                <a
                  href={`/api/auth/google/start?locale=${locale}&intent=buddy`}
                  className="motion-press relative mt-8 flex h-14 w-full items-center justify-center rounded-full bg-primary px-14 font-display text-sm font-bold text-on-primary shadow-[0_12px_28px_rgba(209,63,50,0.25)] transition-colors hover:bg-primary-hover"
                >
                  <span className="absolute left-3 flex size-9 items-center justify-center rounded-full bg-white shadow-sm">
                    <GoogleIcon className="size-5" />
                  </span>
                  {t("continueWithGoogle")}
                </a>
                <p className="mt-5 text-xs leading-5 text-muted">
                  {authT("legalNoticeStart")}{" "}
                  <span className="font-semibold text-primary underline underline-offset-2">
                    {authT("termsOfService")}
                  </span>{" "}
                  {authT("legalNoticeMiddle")}{" "}
                  <span className="font-semibold text-primary underline underline-offset-2">
                    {authT("privacyPolicy")}
                  </span>
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
