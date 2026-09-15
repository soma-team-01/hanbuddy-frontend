"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import {
  BANKS,
  SIGNUP_SOURCES,
  type SignupExtraDraft,
  type SignupExtraError,
} from "@/lib/auth/signup-extra";
import { OnboardingSelect } from "./OnboardingSelect";

const INPUT =
  "h-[50px] w-full min-w-0 rounded-xl border border-line-soft bg-white px-4 text-base text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary";

export function SignupExtraFields({
  value,
  onChange,
  isBuddy,
  error,
}: Readonly<{
  value: SignupExtraDraft;
  onChange: (value: SignupExtraDraft) => void;
  isBuddy: boolean;
  error: SignupExtraError | null;
}>) {
  const t = useTranslations("SignupExtra");
  const id = useId();
  return (
    <div className="mt-8 max-w-3xl space-y-6 border-t border-line-soft pt-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-ink">{t("sourceLabel")}</p>
        <OnboardingSelect
          label={t("sourceLabel")}
          value={value.signupSource}
          options={[
            { value: "", label: t("none") },
            ...SIGNUP_SOURCES.map((source) => ({ value: source, label: t(`sources.${source}`) })),
          ]}
          onChange={(signupSource) => onChange({ ...value, signupSource, signupSourceDetail: "" })}
          invalid={error?.field === "source"}
          describedBy={error?.field === "source" ? `${id}-source-error` : undefined}
        />
        {value.signupSource === "OTHER" && (
          <label className="block space-y-2 text-sm text-ink">
            <span>{t("sourceDetailLabel")}</span>
            <input
              className={INPUT}
              value={value.signupSourceDetail}
              maxLength={100}
              autoComplete="off"
              onChange={(event) => onChange({ ...value, signupSourceDetail: event.target.value })}
              aria-invalid={error?.field === "source" || undefined}
              aria-describedby={error?.field === "source" ? `${id}-source-error` : undefined}
            />
          </label>
        )}
        {error?.field === "source" && (
          <p id={`${id}-source-error`} role="alert" className="text-sm text-danger">
            {t(`errors.${error.key}`)}
          </p>
        )}
      </div>
      {isBuddy && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-ink">{t("bankTitle")}</p>
          <p className="text-sm text-muted">{t("bankHint")}</p>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
            <OnboardingSelect
              label={t("bankLabel")}
              value={value.bankName}
              options={[
                { value: "", label: t("bankPlaceholder") },
                ...Object.entries(BANKS).map(([bank, label]) => ({ value: bank, label })),
              ]}
              onChange={(bankName) => onChange({ ...value, bankName })}
              invalid={error?.field === "bank"}
              describedBy={error?.field === "bank" ? `${id}-bank-error` : undefined}
            />
            <input
              aria-label={t("accountLabel")}
              className={INPUT}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder={t("accountLabel")}
              maxLength={50}
              value={value.bankAccountNumber}
              onChange={(event) => onChange({ ...value, bankAccountNumber: event.target.value })}
              aria-invalid={error?.field === "bank" || undefined}
              aria-describedby={error?.field === "bank" ? `${id}-bank-error` : undefined}
            />
          </div>
          {error?.field === "bank" && (
            <p id={`${id}-bank-error`} role="alert" className="text-sm text-danger">
              {t(`errors.${error.key}`)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
