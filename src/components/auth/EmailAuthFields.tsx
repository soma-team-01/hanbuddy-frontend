"use client";

import { useEffect, useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { isValidNewPassword } from "@/lib/auth/email";

export const authButtonClass =
  "min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong disabled:cursor-not-allowed disabled:opacity-50";
export const authLinkClass =
  "text-sm font-semibold text-primary-strong underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong";

export function AuthInput({
  label,
  endAdornment,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; endAdornment?: ReactNode }) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  return (
    <div className="grid min-w-0 gap-2 text-sm font-semibold text-ink">
      <label htmlFor={id}>{label}</label>
      <div className="relative min-w-0">
        <input
          {...props}
          id={id}
          className={`focus-border-only h-12 w-full min-w-0 rounded-xl border border-line-strong bg-canvas-soft px-4 text-base font-normal text-ink transition-colors hover:border-muted focus:border-primary disabled:bg-panel ${endAdornment ? "pr-20" : ""}`}
        />
        {endAdornment && (
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-normal text-muted tabular-nums">
            {endAdornment}
          </span>
        )}
      </div>
    </div>
  );
}

export function PasswordFields({
  password,
  confirmation,
  onPassword,
  onConfirmation,
}: {
  password: string;
  confirmation: string;
  onPassword: (value: string) => void;
  onConfirmation: (value: string) => void;
}) {
  const t = useTranslations("EmailAuth");
  const passwordHintId = useId();
  const confirmationHintId = useId();
  const hasPassword = password.length > 0;
  const passwordValid = isValidNewPassword(password);
  const hasConfirmation = confirmation.length > 0;
  const passwordsMatch = password === confirmation;
  const passwordMessage =
    !hasPassword || password.length < 8
      ? "passwordHint"
      : passwordValid
        ? "passwordValid"
        : "passwordInvalid";
  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <AuthInput
          label={t("password")}
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={64}
          value={password}
          onChange={(e) => onPassword(e.target.value)}
          aria-describedby={passwordHintId}
          aria-invalid={hasPassword && !passwordValid}
        />
        <p
          id={passwordHintId}
          aria-live="polite"
          className={`text-sm leading-6 ${!hasPassword ? "text-muted" : passwordValid ? "text-success" : "text-danger"}`}
        >
          {t(passwordMessage)}
        </p>
      </div>
      <div className="grid gap-2">
        <AuthInput
          label={t("confirm")}
          name="passwordConfirmation"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={64}
          value={confirmation}
          onChange={(e) => onConfirmation(e.target.value)}
          aria-describedby={confirmationHintId}
          aria-invalid={hasConfirmation && !passwordsMatch}
        />
        <p
          id={confirmationHintId}
          aria-live="polite"
          className={`text-sm leading-6 empty:hidden ${passwordsMatch ? "text-success" : "text-danger"}`}
        >
          {hasConfirmation ? t(passwordsMatch ? "passwordMatch" : "mismatch") : ""}
        </p>
      </div>
    </div>
  );
}

export function useRemainingSeconds(deadline: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
