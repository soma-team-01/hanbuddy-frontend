"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { StartChatButton } from "@/components/chat/StartChatButton";
import { Avatar } from "@/components/ui/Avatar";
import {
  ChatBubbleDotsIcon,
  MapPinIcon,
  MessageSquareIcon,
  UsersIcon,
  XIcon,
} from "@/components/ui/icons";
import type { Locale } from "@/i18n/routing";
import { formatApplicantContact, formatNationalityCode } from "@/lib/api/buddy-view";
import type { BuddyApplicationApplicantSummaryResponse } from "@/types/buddy";

/** 신청자를 눌렀을 때 뜨는 프로필. 연락처·인원과 함께 바로 1:1 대화로 이어진다 */
export function ApplicantProfileDialog({
  applicant,
  locale,
  onClose,
}: Readonly<{
  applicant: BuddyApplicationApplicantSummaryResponse;
  locale: Locale;
  onClose: () => void;
}>) {
  const t = useTranslations("BuddyDashboard");
  const tChat = useTranslations("Chat");
  const tAccessibility = useTranslations("Accessibility");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const specialRequest = applicant.specialRequest?.trim();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="applicant-profile-name"
      onClose={onClose}
      className="motion-dialog m-0 w-full max-w-none rounded-t-3xl border-0 bg-canvas-soft p-6 text-ink shadow-2xl backdrop:bg-ink/45 backdrop:backdrop-blur-[3px] max-md:mt-auto md:m-auto md:w-[calc(100%-3rem)] md:max-w-xs md:rounded-2xl"
    >
      <div className="flex justify-end">
        <button
          type="button"
          aria-label={tAccessibility("closeDialog")}
          onClick={onClose}
          className="-mt-2 -mr-2 flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:text-primary"
        >
          <XIcon className="size-4" />
        </button>
      </div>

      <div className="flex flex-col items-center gap-3 pb-1 text-center">
        <Avatar name={applicant.applicantName} src={applicant.applicantProfileImageUrl} size={80} />
        <div>
          <p id="applicant-profile-name" className="font-display text-lg font-bold text-ink">
            {applicant.applicantName}
          </p>
          <p className="mt-1 flex items-center justify-center gap-1 text-sm text-muted">
            <MapPinIcon className="size-3.5 shrink-0" />
            {formatNationalityCode(applicant.applicantNationalityCode, locale)}
          </p>
        </div>
      </div>

      <dl className="mt-4 flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-muted">
            <MessageSquareIcon className="size-3.5" />
            {t("profileContact")}
          </dt>
          <dd className="min-w-0 truncate font-semibold text-ink">
            {formatApplicantContact(applicant, locale)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-muted">
            <UsersIcon className="size-3.5" />
            {t("profileGuestCount")}
          </dt>
          <dd className="font-semibold text-ink">
            {t("profileGuests", { count: applicant.guestCount })}
          </dd>
        </div>
      </dl>

      {specialRequest ? (
        <div className="mt-3 border-l-2 border-primary/40 pl-3">
          <p className="text-[10px] font-bold tracking-[0.1em] text-primary uppercase">
            {t("specialRequestLabel")}
          </p>
          <p className="mt-0.5 text-xs leading-5 whitespace-pre-line text-ink">{specialRequest}</p>
        </div>
      ) : null}

      <StartChatButton
        target={{ kind: "direct", targetUserId: applicant.applicantUserId }}
        label={tChat("messageApplicant", { name: applicant.applicantName })}
        icon={<ChatBubbleDotsIcon className="size-4" />}
        onOpened={onClose}
        className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-display text-sm font-bold text-on-primary transition-colors enabled:hover:bg-primary-hover disabled:opacity-60"
      />
    </dialog>
  );
}
