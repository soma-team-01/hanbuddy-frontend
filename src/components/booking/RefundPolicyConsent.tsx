"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { PolicyDocumentData } from "@/types/policy";
import { RefundPolicyDialog } from "./RefundPolicyDialog";

export function RefundPolicyConsent({
  agreed,
  onAgreedChange,
  document,
  idPrefix = "refund-policy",
}: Readonly<{
  agreed: boolean;
  onAgreedChange: (agreed: boolean) => void;
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
        className="rounded-xl border border-line-soft bg-canvas-soft px-3.5 py-3 shadow-[0_8px_24px_rgba(38,27,24,0.03)]"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id={headingId} className="font-display text-sm font-bold text-ink">
            {t("refundPolicyHeading")}
          </h2>
          <button
            type="button"
            disabled={!document}
            onClick={() => setPolicyOpen(true)}
            className="shrink-0 text-xs font-semibold text-ink underline decoration-ink/25 underline-offset-4 transition-colors enabled:hover:text-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("refundPolicyLink")}
          </button>
        </div>

        <p
          id={noticeId}
          className="mt-2 rounded-lg bg-primary-soft/65 px-3 py-2 text-xs leading-5 text-ink/75"
        >
          {t("statutoryWithdrawalNotice")}
        </p>

        <dl
          id={summaryId}
          className="mt-2 divide-y divide-line-soft overflow-hidden rounded-lg border border-line-soft"
        >
          {(["full", "half", "none", "noShow"] as const).map((rule) => (
            <div
              key={rule}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-1.5 text-xs leading-5"
            >
              <dt className="text-muted">{t(`refundRules.${rule}.label`)}</dt>
              <dd className="text-right font-display font-bold text-ink">
                {t(`refundRules.${rule}.value`)}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-1.5 text-[11px] leading-4 text-muted">{t("actualPaymentRefundNotice")}</p>

        <label className="mt-2.5 flex cursor-pointer items-start gap-2.5 border-t border-line-soft pt-2.5">
          <input
            type="checkbox"
            required
            aria-describedby={`${noticeId} ${summaryId}`}
            checked={agreed}
            onChange={(event) => onAgreedChange(event.target.checked)}
            className="mt-0.5 size-4 shrink-0 rounded accent-primary"
          />
          <span className="text-xs leading-5 font-semibold text-ink">{t("agreement")}</span>
        </label>
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
