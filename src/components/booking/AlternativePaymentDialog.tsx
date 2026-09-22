"use client";

import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { XIcon } from "@/components/ui/icons";
import { useModalDialog } from "@/components/ui/use-modal-dialog";
import { ContactChannelLinks } from "@/components/contact/ContactChannelLinks";
import { getLocaleOrDefault } from "@/i18n/routing";
import { useMeasurementEvents } from "@/components/analytics/AnalyticsProvider";
import { myProfileQueryOptions } from "@/lib/query/users";
import { getSeoulDateTimeParts } from "@/lib/datetime";

export interface PaymentInquiryBooking {
  activityTitle: string;
  buddyName: string;
  startAt?: string;
  dateLabel?: string;
  timeLabel?: string;
  participants: number;
}

/** Prefer the precise KST timestamp, retaining selected labels for legacy sessions. */
function getInquirySchedule(booking?: PaymentInquiryBooking): string | null {
  const schedule = booking?.startAt ? getSeoulDateTimeParts(booking.startAt) : null;
  if (schedule) return `${schedule.date} ${schedule.time} (KST)`;
  const date = booking?.dateLabel?.trim();
  const time = booking?.timeLabel?.trim();
  return date && time ? `${date} ${time} (KST)` : null;
}

/** Inquiry only: opening and following a channel never create a booking or payment. */
export function AlternativePaymentDialog({
  onClose,
  booking,
}: Readonly<{
  onClose: () => void;
  booking?: PaymentInquiryBooking;
}>) {
  const t = useTranslations("AlternativePayment");
  const tAccessibility = useTranslations("Accessibility");
  const locale = getLocaleOrDefault(useLocale());
  const { trackInquiry } = useMeasurementEvents();
  const titleId = useId();
  const descriptionId = useId();
  const { dialogRef, closeRef } = useModalDialog();
  const profile = useQuery({ ...myProfileQueryOptions(), retry: false, refetchOnMount: "always" });
  const [copyState, setCopyState] = useState<{
    message: string;
    result: "copied" | "failed";
  } | null>(null);
  const schedule = getInquirySchedule(booking);
  const email = profile.data?.email;
  const message = t("message", {
    email: email?.trim() || t("missingValue"),
    buddy: booking?.buddyName.trim() || t("missingValue"),
    activity: booking?.activityTitle.trim() || t("missingValue"),
    schedule: schedule ?? t("missingSchedule"),
    participants: booking?.participants ?? t("missingValue"),
    method: t("preferredMethod"),
  });

  /** Copies the localized inquiry template and exposes clipboard failures to the user. */
  async function copyTemplate() {
    try {
      await navigator.clipboard.writeText(message);
      setCopyState({ message, result: "copied" });
    } catch {
      setCopyState({ message, result: "failed" });
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
      className="motion-dialog m-0 h-dvh max-h-none w-screen max-w-none items-end justify-center overflow-hidden border-0 bg-transparent p-0 text-ink backdrop:bg-ink/45 backdrop:backdrop-blur-[3px] open:flex md:items-center md:p-6"
    >
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        data-testid="payment-inquiry-backdrop"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div className="relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-canvas-soft shadow-2xl md:max-w-md md:rounded-2xl">
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
            {copyState?.message === message && (
              <p role="status" className="mt-2 text-xs leading-5 text-muted">
                {t(copyState.result === "copied" ? "copied" : "copyFailed")}
              </p>
            )}
          </div>
          <ContactChannelLinks
            message={message}
            onChannelClick={(channel) =>
              trackInquiry({ channel, placement: "payment_inquiry", locale })
            }
          />
          <p className="mt-4 text-center text-xs leading-5 text-muted">{t("notConfirmed")}</p>
        </div>
      </div>
    </dialog>
  );
}
