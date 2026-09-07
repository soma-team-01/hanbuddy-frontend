"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { PolicyDocument } from "@/components/policy/PolicyDocument";
import { XIcon } from "@/components/ui/icons";
import type { Locale } from "@/i18n/routing";
import type { PolicyDocumentData } from "@/types/policy";

const HISTORY_STATE_KEY = "hanbuddyPolicyDialog";

export function RefundPolicyDialog({
  document,
  idPrefix,
  onClose,
}: Readonly<{
  document: PolicyDocumentData;
  idPrefix: string;
  onClose: () => void;
}>) {
  const locale = useLocale() as Locale;
  const t = useTranslations("Booking");
  const tAccessibility = useTranslations("Accessibility");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  const closeRequestedRef = useRef(false);
  const titleId = `${idPrefix}-dialog-title`;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();

    const currentState =
      typeof window.history.state === "object" && window.history.state !== null
        ? window.history.state
        : {};
    window.history.pushState(
      { ...currentState, [HISTORY_STATE_KEY]: idPrefix },
      "",
      window.location.href,
    );

    function handlePopState() {
      onCloseRef.current();
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [idPrefix]);

  function requestClose() {
    if (closeRequestedRef.current) return;
    closeRequestedRef.current = true;
    window.history.back();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClick={(event) => {
        if (event.currentTarget === event.target) requestClose();
      }}
      className="motion-dialog m-0 w-full max-w-none rounded-t-3xl border-0 bg-canvas-soft p-0 text-ink shadow-2xl backdrop:bg-ink/45 backdrop:backdrop-blur-[3px] max-md:mt-auto md:m-auto md:w-[calc(100%-3rem)] md:max-w-3xl md:rounded-2xl"
    >
      <div className="flex items-start justify-between gap-4 border-b border-line-soft px-5 py-4 md:px-7">
        <div className="min-w-0">
          <h2 id={titleId} className="font-display text-lg leading-6 font-bold text-ink">
            {document.title}
          </h2>
          <p className="mt-1 text-xs text-muted">
            {t("policyDocumentVersion", { version: document.version })}
          </p>
        </div>
        <button
          type="button"
          aria-label={tAccessibility("closeDialog")}
          onClick={requestClose}
          className="-mt-2 -mr-2 flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-primary-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
        >
          <XIcon className="size-5" />
        </button>
      </div>

      <div className="max-h-[min(76svh,720px)] overflow-y-auto px-5 py-5 md:px-7 md:py-6">
        <PolicyDocument locale={locale} source={document.source} />
      </div>
    </dialog>
  );
}
