"use client";

import NextLink from "next/link";
import { useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import { XIcon } from "@/components/ui/icons";
import { LoginMethods } from "./LoginMethods";
import { useModalDialog } from "@/components/ui/use-modal-dialog";
import { Link } from "@/i18n/navigation";
import { getLocaleOrDefault } from "@/i18n/routing";
import { getPolicyPath } from "@/lib/policy-routes";

const POLICY_LINK_CLASS_NAME =
  "font-semibold text-primary underline underline-offset-2 hover:text-primary-hover focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong";

/**
 * 비로그인 사용자가 예약을 누른 자리에서 로그인을 안내한다.
 * returnTo는 로그인 후 이어갈 로케일 독립 경로(예: /activities/42/book?scheduleId=101)다.
 */
export function LoginPromptDialog({
  returnTo,
  emailLoginEnabled = false,
  onClose,
}: Readonly<{
  returnTo: string;
  /** 심사용 로그인 화면으로 가는 추가 링크. 일반 이메일 로그인은 항상 제공한다. */
  emailLoginEnabled?: boolean;
  onClose: () => void;
}>) {
  const locale = getLocaleOrDefault(useLocale());
  const t = useTranslations("Auth");
  const emailT = useTranslations("EmailAuth");
  const tAccessibility = useTranslations("Accessibility");
  const titleId = useId();
  const { dialogRef, closeRef } = useModalDialog();
  const next = encodeURIComponent(returnTo);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
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
        data-testid="login-prompt-backdrop"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div className="relative max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-canvas-soft px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center shadow-2xl md:max-w-md md:rounded-2xl md:p-7">
        <div className="flex justify-end">
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
        <h2 id={titleId} className="mb-6 font-display text-xl font-bold text-balance">
          {t("bookingLoginPrompt")}
        </h2>
        <LoginMethods
          locale={locale}
          returnTo={returnTo}
          googleHref={`/api/auth/google/start?locale=${locale}&next=${next}`}
        />
        {emailLoginEnabled ? (
          <Link
            href={`/login?next=${next}`}
            className="mt-3 inline-flex min-h-11 items-center text-xs text-muted underline underline-offset-4"
          >
            {emailT("review")}
          </Link>
        ) : null}
        <p className="mt-5 text-xs leading-5 text-muted">
          {t("legalNoticeStart")}{" "}
          <NextLink
            href={getPolicyPath(locale, "terms-of-service")}
            className={POLICY_LINK_CLASS_NAME}
          >
            {t("termsOfService")}
          </NextLink>{" "}
          {t("legalNoticeMiddle")}{" "}
          <NextLink
            href={getPolicyPath(locale, "privacy-policy")}
            className={POLICY_LINK_CLASS_NAME}
          >
            {t("privacyPolicy")}
          </NextLink>
          {t("legalNoticeEnd")}
        </p>
      </div>
    </dialog>
  );
}
