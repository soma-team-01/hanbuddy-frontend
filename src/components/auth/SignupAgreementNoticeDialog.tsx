"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { PolicyDocument } from "@/components/policy/PolicyDocument";
import { XIcon } from "@/components/ui/icons";
import type { Locale } from "@/i18n/routing";
import {
  SIGNUP_AGREEMENT_DOCUMENT_VERSION,
  getSignupAgreementNotice,
  type SignupAgreementDocuments,
} from "@/lib/auth/signup-agreement-notices";
import type { SignupAgreementType, UserType } from "@/lib/auth/types";

export function SignupAgreementNoticeDialog({
  agreementType,
  userType = "TOURIST",
  title,
  document,
  onClose,
}: Readonly<{
  agreementType: SignupAgreementType;
  userType?: UserType;
  title: string;
  document?: SignupAgreementDocuments[SignupAgreementType];
  onClose: () => void;
}>) {
  const locale = useLocale() as Locale;
  const t = useTranslations("Onboarding.agreements");
  const tAccessibility = useTranslations("Accessibility");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const notice = getSignupAgreementNotice(agreementType, userType, locale);
  const version = document?.version ?? SIGNUP_AGREEMENT_DOCUMENT_VERSION;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="signup-agreement-notice-title"
      onClose={onClose}
      className="motion-dialog m-0 w-full max-w-none rounded-t-3xl border-0 bg-canvas-soft p-0 text-ink shadow-2xl backdrop:bg-ink/45 backdrop:backdrop-blur-[3px] max-md:mt-auto md:m-auto md:w-[calc(100%-3rem)] md:max-w-3xl md:rounded-2xl"
    >
      <div className="flex items-start justify-between gap-4 border-b border-line-soft px-5 py-5 md:px-7">
        <div className="min-w-0">
          <h2
            id="signup-agreement-notice-title"
            className="font-display text-lg leading-6 font-bold text-ink"
          >
            {title}
          </h2>
          <p className="mt-1 text-xs text-muted">{t("documentVersion", { version })}</p>
        </div>
        <button
          type="button"
          aria-label={tAccessibility("closeDialog")}
          onClick={onClose}
          className="-mt-2 -mr-2 flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-primary-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
        >
          <XIcon className="size-5" />
        </button>
      </div>

      <div className="max-h-[min(72svh,680px)] overflow-y-auto px-5 py-5 text-sm leading-6 md:px-7 md:py-6">
        {document ? (
          <PolicyDocument locale={locale} source={document.source} />
        ) : (
          <>
            {notice.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-3 text-ink/85 first:mt-0">
                {paragraph}
              </p>
            ))}

            {notice.details ? (
              <dl className="mt-5 divide-y divide-line-soft overflow-hidden rounded-xl border border-line-soft">
                {notice.details.map((detail) => (
                  <div
                    key={detail.label}
                    className="grid gap-1 bg-white px-4 py-3 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-4"
                  >
                    <dt className="font-semibold text-ink">{detail.label}</dt>
                    <dd className="text-ink/75">{detail.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </>
        )}
      </div>
    </dialog>
  );
}
