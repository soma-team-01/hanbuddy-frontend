"use client";

import NextLink from "next/link";
import { useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import { GoogleIcon, XIcon } from "@/components/ui/icons";
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
  /** 심사용 이메일 로그인이 켜진 환경에서만 로그인 화면으로 가는 링크를 함께 둔다 */
  emailLoginEnabled?: boolean;
  onClose: () => void;
}>) {
  const locale = getLocaleOrDefault(useLocale());
  const t = useTranslations("Auth");
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
        <h2 id={titleId} className="font-display text-xl font-bold text-balance">
          {t("bookingLoginPrompt")}
        </h2>
        <a
          href={`/api/auth/google/start?locale=${locale}&next=${next}`}
          className="motion-press relative mt-6 flex h-14 w-full items-center justify-center rounded-full border border-primary bg-primary px-14 font-display text-sm font-bold text-on-primary shadow-[0_12px_28px_rgba(209,63,50,0.28)] transition-colors hover:border-primary-hover hover:bg-primary-hover"
        >
          <span className="absolute left-3 flex size-9 items-center justify-center rounded-full bg-white shadow-sm">
            <GoogleIcon className="size-5" />
          </span>
          {t("continueWithGoogle")}
        </a>
        {emailLoginEnabled ? (
          <Link
            href={`/login?next=${next}`}
            className="mt-3 flex h-12 w-full items-center justify-center rounded-full border border-line-strong bg-white px-6 font-display text-sm font-bold text-ink transition-colors hover:border-primary/50 hover:bg-primary-soft/40"
          >
            {t("reviewLogin.title")}
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
