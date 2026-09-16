"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { CheckIcon } from "@/components/ui/icons";
import {
  SIGNUP_SOURCES,
  type SignupExtraDraft,
  type SignupExtraError,
} from "@/lib/auth/signup-extra";
import { BankSelect } from "./BankSelect";

const INPUT =
  "focus-border-only h-[50px] w-full min-w-0 rounded-xl border border-line-soft bg-white px-4 text-base text-ink outline-none transition-colors hover:border-primary focus:border-primary";

export function SignupExtraFields({
  value,
  onChange,
  section,
  error,
}: Readonly<{
  value: SignupExtraDraft;
  onChange: (value: SignupExtraDraft) => void;
  section: "source" | "bank";
  error: SignupExtraError | null;
}>) {
  const t = useTranslations("SignupExtra");
  const id = useId();
  return (
    <div className="mt-8 max-w-3xl space-y-8 border-t border-line-soft pt-6 max-md:mt-4 max-md:space-y-4 max-md:pt-4">
      {section === "source" && (
        <fieldset className="min-w-0 space-y-3">
          <legend className="text-sm font-medium text-ink">{t("sourceLabel")}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SIGNUP_SOURCES.map((source) => (
              <label key={source} className="relative min-w-0 cursor-pointer">
                <input
                  type="radio"
                  name={`${id}-source`}
                  value={source}
                  required
                  checked={value.signupSource === source}
                  onChange={() =>
                    onChange({ ...value, signupSource: source, signupSourceDetail: "" })
                  }
                  aria-invalid={error?.field === "source" || undefined}
                  aria-describedby={error?.field === "source" ? `${id}-source-error` : undefined}
                  className="peer sr-only"
                />
                <span className="flex h-full min-h-11 items-center justify-between gap-2 rounded-xl border border-line-soft bg-white px-3 py-2 text-sm text-muted transition-colors peer-checked:border-primary peer-checked:text-primary-strong peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary hover:border-primary hover:text-primary-strong max-md:min-h-10 max-md:py-1.5">
                  <span>{t(`sources.${source}`)}</span>
                  <CheckIcon
                    aria-hidden
                    className={`size-3.5 shrink-0 ${value.signupSource === source ? "visible" : "invisible"}`}
                  />
                </span>
              </label>
            ))}
          </div>
          {value.signupSource === "OTHER" && (
            <label className="block space-y-2 text-sm text-ink">
              <span>{t("sourceDetailLabel")}</span>
              <input
                className={INPUT}
                value={value.signupSourceDetail}
                maxLength={100}
                required
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
        </fieldset>
      )}
      {section === "bank" && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-ink">{t("bankTitle")}</p>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
            <div className="space-y-1.5">
              <p className="text-sm text-muted">{t("bankLabel")}</p>
              <BankSelect
                value={value.bankName}
                onChange={(bankName) => onChange({ ...value, bankName })}
                invalid={error?.field === "bank"}
                describedBy={error?.field === "bank" ? `${id}-bank-error` : undefined}
              />
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm text-muted">{t("accountLabel")}</span>
              <input
                aria-label={t("accountLabel")}
                className={INPUT}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder={t("accountLabel")}
                maxLength={50}
                required
                value={value.bankAccountNumber}
                onChange={(event) => onChange({ ...value, bankAccountNumber: event.target.value })}
                aria-invalid={error?.field === "bank" || undefined}
                aria-describedby={error?.field === "bank" ? `${id}-bank-error` : undefined}
              />
            </label>
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
