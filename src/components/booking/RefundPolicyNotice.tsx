"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
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
  const headingId = `${idPrefix}-heading`;
  const noticeId = `${idPrefix}-notice`;
  const summaryId = `${idPrefix}-summary`;

  return (
    <>
      <section
        aria-labelledby={headingId}
        className="rounded-xl border border-line-soft bg-canvas-soft px-3 py-2 shadow-[0_6px_18px_rgba(38,27,24,0.025)]"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 id={headingId} className="font-display text-xs font-bold text-ink">
            {t("refundPolicyHeading")}
          </h2>
          <button
            type="button"
            disabled={!document}
            onClick={() => setPolicyOpen(true)}
            className="shrink-0 text-[11px] font-semibold text-ink underline decoration-ink/25 underline-offset-3 transition-colors enabled:hover:text-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("refundPolicyLink")}
          </button>
        </div>

        <p
          id={noticeId}
          className="mt-1.5 rounded-md bg-primary-soft/65 px-2.5 py-1.5 text-[10px] leading-4 text-ink/75"
        >
          {t("statutoryWithdrawalNotice")}
        </p>

        <dl
          id={summaryId}
          className="mt-1.5 divide-y divide-line-soft overflow-hidden rounded-md border border-line-soft"
        >
          {(["full", "half", "none", "noShow"] as const).map((rule) => (
            <div
              key={rule}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2.5 py-0.5 text-[10px] leading-4"
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

        <p className="mt-1 text-[9px] leading-3 text-muted">{t("actualPaymentRefundNotice")}</p>
      </section>

      {policyOpen && document ? (
        <RefundPolicyDialog
          document={document}
          idPrefix={idPrefix}
          onClose={() => setPolicyOpen(false)}
        />
      ) : null}
    </>
  );
}

export function RefundPolicyAgreement({
  agreed,
  onAgreedChange,
  describedBy,
  className = "",
}: Readonly<{
  agreed: boolean;
  onAgreedChange: (agreed: boolean) => void;
  describedBy?: string;
  className?: string;
}>) {
  const t = useTranslations("Booking");

  return (
    <label className={`flex cursor-pointer items-start gap-2 ${className}`}>
      <input
        type="checkbox"
        required
        aria-describedby={describedBy}
        checked={agreed}
        onChange={(event) => onAgreedChange(event.target.checked)}
        className="mt-px size-3.5 shrink-0 rounded accent-primary"
      />
      <span className="text-[10px] leading-4 font-semibold text-ink">{t("agreement")}</span>
    </label>
  );
}
