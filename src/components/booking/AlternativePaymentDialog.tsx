"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { InstagramIcon, KakaoTalkIcon, MailIcon, WhatsAppIcon, XIcon } from "@/components/ui/icons";
import { CONTACT_DETAILS } from "@/lib/contact-details";
import { getLocaleOrDefault } from "@/i18n/routing";
import { useMeasurementEvents } from "@/components/analytics/AnalyticsProvider";

/** Inquiry only: opening and following a channel never create a booking or payment. */
export function AlternativePaymentDialog({
  onClose,
}: Readonly<{
  onClose: () => void;
}>) {
  const t = useTranslations("AlternativePayment");
  const tAccessibility = useTranslations("Accessibility");
  const locale = getLocaleOrDefault(useLocale());
  const { trackInquiry } = useMeasurementEvents();
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const message = t("message");
  const channels = [
    {
      name: "WhatsApp",
      channel: "whatsapp",
      Icon: WhatsAppIcon,
      href: `${CONTACT_DETAILS.whatsappUrl}?text=${encodeURIComponent(message)}`,
    },
    { name: "KakaoTalk", channel: "kakao", Icon: KakaoTalkIcon, href: CONTACT_DETAILS.kakaoUrl },
    {
      name: "Instagram",
      channel: "instagram",
      Icon: InstagramIcon,
      href: CONTACT_DETAILS.instagramUrl,
    },
    {
      name: t("email"),
      channel: "email",
      Icon: MailIcon,
      href: `mailto:${CONTACT_DETAILS.email}`,
    },
  ];

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

  async function copyTemplate() {
    try {
      await navigator.clipboard.writeText(message);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

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
        data-testid="payment-inquiry-backdrop"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div className="motion-dialog relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-canvas-soft shadow-2xl md:max-w-md md:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-5 md:px-7 md:pt-7">
          <h2 id={titleId} className="font-display text-lg leading-7 font-bold">
            {t("title")}
          </h2>
          <button
            ref={closeRef}
            type="button"
            aria-label={tAccessibility("closeDialog")}
            onClick={onClose}
            className="-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:text-primary"
          >
            <XIcon className="size-5" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-5 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-7 md:pb-7">
          <p id={descriptionId} className="text-sm leading-6 text-muted">
            {t("description")}
          </p>
          <div className="mt-5 rounded-xl border border-line-soft p-4">
            <h3 className="text-sm font-semibold">{t("exampleTitle")}</h3>
            <p className="mt-1 mb-3 text-xs leading-5 text-muted">{t("exampleHint")}</p>
            <p
              data-testid="payment-inquiry-message"
              className="text-sm leading-6 break-words whitespace-pre-line select-text"
            >
              {message}
            </p>
            <button
              type="button"
              onClick={() => void copyTemplate()}
              className="mt-3 min-h-11 w-full rounded-lg border border-primary px-3 text-sm font-semibold text-primary-strong transition-colors hover:border-primary-hover hover:text-primary-hover"
            >
              {t("copy")}
            </button>
            {copyState !== "idle" && (
              <p role="status" className="mt-2 text-xs leading-5 text-muted">
                {t(copyState === "copied" ? "copied" : "copyFailed")}
              </p>
            )}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {channels.map(({ name, channel, Icon, href }) => (
              <a
                key={name}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackInquiry({ channel, placement: "payment_inquiry", locale })}
                className="flex min-h-20 min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-line-soft px-1 py-3 text-xs font-medium text-ink transition-colors hover:border-primary hover:text-primary-strong"
              >
                <Icon aria-hidden className="size-6 text-primary" />
                <span>{name}</span>
              </a>
            ))}
          </div>
          <p className="mt-4 text-center text-xs leading-5 text-muted">{t("notConfirmed")}</p>
        </div>
      </div>
    </dialog>
  );
}
