"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ContactChannelLinks } from "@/components/contact/ContactChannelLinks";
import { ChatBubbleDotsIcon, XIcon } from "@/components/ui/icons";

export function ActivityContact() {
  const t = useTranslations("ActivityContact");
  const [open, setOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(true);
  const teaserId = useId();

  useEffect(() => {
    if (!showTeaser) return;
    const timeout = window.setTimeout(() => setShowTeaser(false), 3000);
    return () => window.clearTimeout(timeout);
  }, [showTeaser]);

  return (
    <>
      <div className="pointer-events-none fixed right-4 bottom-[calc(var(--fixed-bar-height,0px)+1.5rem)] z-20 md:right-6">
        {showTeaser && (
          <p
            id={teaserId}
            className="activity-contact-teaser absolute top-1/2 right-[calc(100%+0.75rem)] w-60 max-w-[calc(100vw-6rem)] origin-right -translate-y-1/2 rounded-2xl border border-primary/40 bg-canvas-soft px-4 py-3 text-sm leading-5 font-medium text-ink shadow-lg after:absolute after:top-1/2 after:-right-1.5 after:size-3 after:-translate-y-1/2 after:rotate-45 after:border-t after:border-r after:border-primary/40 after:bg-canvas-soft"
          >
            {t("teaser")}
          </p>
        )}
        <button
          type="button"
          aria-label={t("trigger")}
          title={t("trigger")}
          aria-haspopup="dialog"
          aria-describedby={showTeaser ? teaserId : undefined}
          onClick={() => {
            setShowTeaser(false);
            setOpen(true);
          }}
          className="pointer-events-auto flex size-12 items-center justify-center rounded-full bg-primary text-on-primary shadow-md transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          <ChatBubbleDotsIcon aria-hidden className="size-6" />
        </button>
      </div>
      {open && <ActivityContactDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function ActivityContactDialog({ onClose }: Readonly<{ onClose: () => void }>) {
  const t = useTranslations("ActivityContact");
  const tAccessibility = useTranslations("Accessibility");
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const dialog = dialogRef.current;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    closeRef.current?.focus();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none items-end justify-center overflow-hidden border-0 bg-transparent p-0 text-ink backdrop:bg-ink/45 backdrop:backdrop-blur-[3px] open:flex md:items-center md:p-6"
    >
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        data-testid="activity-contact-backdrop"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div className="motion-dialog relative max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-canvas-soft px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl md:max-w-md md:rounded-2xl md:p-7">
        <div className="flex items-start justify-between gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <ChatBubbleDotsIcon aria-hidden className="size-6" />
          </span>
          <button
            ref={closeRef}
            type="button"
            aria-label={tAccessibility("closeDialog")}
            onClick={onClose}
            className="-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
          >
            <XIcon aria-hidden className="size-5" />
          </button>
        </div>
        <h2 id={titleId} className="mt-4 font-display text-xl font-bold">
          {t("title")}
        </h2>
        <p id={descriptionId} className="mt-2 text-sm leading-6 text-muted">
          {t("description")}
        </p>
        <ContactChannelLinks />
        <p className="mt-4 text-xs leading-5 text-muted">{t("hint")}</p>
      </div>
    </dialog>
  );
}
