"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function RefundPolicyConsent({
  agreed,
  onAgreedChange,
  idPrefix = "refund-policy",
}: Readonly<{
  agreed: boolean;
  onAgreedChange: (agreed: boolean) => void;
  idPrefix?: string;
}>) {
  const t = useTranslations("Booking");
  const headingId = `${idPrefix}-heading`;
  const noticeId = `${idPrefix}-notice`;
  const summaryId = `${idPrefix}-summary`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 id={headingId} className="font-display text-base font-bold text-ink">
          {t("refundPolicyHeading")}
        </h2>
        <Link
          href="/policies/cancellation-refund-policy"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-sm font-semibold text-primary underline decoration-primary/35 underline-offset-4 transition-colors hover:text-primary-hover"
        >
          {t("refundPolicyLink")}
        </Link>
      </div>

      <p
        id={noticeId}
        className="rounded-xl bg-primary-soft px-4 py-3 text-sm leading-6 text-ink/80"
      >
        {t("statutoryWithdrawalNotice")}
      </p>

      <dl
        id={summaryId}
        className="divide-y divide-line-soft overflow-hidden rounded-xl border border-line-soft bg-canvas-soft"
      >
        {(["full", "half", "none", "noShow"] as const).map((rule) => (
          <div
            key={rule}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 text-sm"
          >
            <dt className="text-muted">{t(`refundRules.${rule}.label`)}</dt>
            <dd
              className={`text-right font-display font-bold ${
                rule === "full" || rule === "half" ? "text-primary" : "text-ink"
              }`}
            >
              {t(`refundRules.${rule}.value`)}
            </dd>
          </div>
        ))}
      </dl>

      <p className="text-xs leading-5 text-muted">{t("actualPaymentRefundNotice")}</p>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line-strong px-4 py-3.5 transition-colors hover:border-primary">
        <input
          type="checkbox"
          required
          aria-describedby={`${noticeId} ${summaryId}`}
          checked={agreed}
          onChange={(event) => onAgreedChange(event.target.checked)}
          className="mt-0.5 size-4.5 shrink-0 rounded accent-primary"
        />
        <span className="text-sm leading-5 font-semibold text-ink">{t("agreement")}</span>
      </label>
    </section>
  );
}
