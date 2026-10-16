"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import type { PolicyDocumentData } from "@/types/policy";
import { RefundPolicyDialog } from "./RefundPolicyDialog";

export function RefundPolicyNotice({
  document,
  idPrefix = "refund-policy",
}: Readonly<{
  document?: PolicyDocumentData;
  idPrefix?: string;
}>) {
  const t = useTranslations("Booking");
  const [policyOpen, setPolicyOpen] = useState(false);
  const policyTriggerRef = useRef<HTMLButtonElement>(null);
  const headingId = `${idPrefix}-heading`;
  const noticeId = `${idPrefix}-notice`;
  const summaryId = `${idPrefix}-summary`;

  return (
    <>
      <section
        aria-labelledby={headingId}
        className="rounded-xl border border-line-soft bg-canvas-soft px-3.5 py-3 shadow-[0_6px_18px_rgba(38,27,24,0.025)]"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 id={headingId} className="font-display text-sm font-bold text-ink">
            {t("refundPolicyHeading")}
          </h2>
          <button
            ref={policyTriggerRef}
            type="button"
            disabled={!document}
            onClick={() => setPolicyOpen(true)}
            className="shrink-0 text-[13px] font-semibold text-ink underline decoration-ink/25 underline-offset-3 transition-colors enabled:hover:text-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("refundPolicyLink")}
          </button>
        </div>

        <p
          id={noticeId}
          className="mt-2 rounded-md bg-primary-soft/65 px-3 py-2 text-[13px] leading-5 text-ink/80"
        >
          {t("statutoryWithdrawalNotice")}
        </p>

        <p className="mt-2 text-[13px] leading-5 text-ink">{t("beforeApprovalRefundNotice")}</p>
        <p className="mt-2 text-[13px] font-semibold text-ink">{t("afterApprovalRefundLabel")}</p>
        <dl
          id={summaryId}
          className="mt-1.5 divide-y divide-line-soft overflow-hidden rounded-md border border-line-soft"
        >
          {(["full", "half", "none", "noShow"] as const).map((rule) => (
            <div
              key={rule}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-1.5 text-[13px] leading-5"
            >
              <dt className="text-muted">{t(`refundRules.${rule}.label`)}</dt>
              <dd
                className={`text-right font-display font-bold ${
                  rule === "full" ? "text-ink" : "text-primary"
                }`}
              >
                {t(`refundRules.${rule}.value`)}
              </dd>
            </div>
          ))}
        </dl>

        <p id={`${idPrefix}-exceptions`} className="mt-2 text-xs leading-4 text-muted">
          {t("refundExceptionsNotice")}
        </p>
        <p className="mt-1 text-xs leading-4 text-muted">{t("actualPaymentRefundNotice")}</p>
      </section>

      {policyOpen && document ? (
        <RefundPolicyDialog
          document={document}
          idPrefix={idPrefix}
          onClose={() => setPolicyOpen(false)}
          returnFocusRef={policyTriggerRef}
        />
      ) : null}
    </>
  );
}

export function RefundPolicyAgreement({
  agreed,
  onAgreedChange,
  describedBy,
}: Readonly<{
  agreed: boolean;
  onAgreedChange: (agreed: boolean) => void;
  describedBy?: string;
}>) {
  const t = useTranslations("Booking");

  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-2 py-3">
      <input
        type="checkbox"
        required
        aria-label={t("agreement")}
        aria-describedby={describedBy}
        checked={agreed}
        onChange={(event) => onAgreedChange(event.target.checked)}
        className="size-5 shrink-0 rounded accent-primary"
      />
      <span aria-hidden="true" className="text-xs leading-5 font-medium text-ink lg:text-[13px]">
        <span className="lg:hidden">{t("agreementCompact")}</span>
        <span className="hidden lg:inline">{t("agreement")}</span>
      </span>
    </label>
  );
}
